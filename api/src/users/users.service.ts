import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserGroupsService } from '../user-groups/user-groups.service';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly userGroupsService: UserGroupsService,
  ) {}

  async onApplicationBootstrap() {
    try {
      // 1. Ensure default system groups exist
      await this.userGroupsService.ensureDefaultGroups();

      // 2. Backward-compatible migration: ensure existing users are properly grouped
      const allUsers = await this.userModel.find().exec();
      for (const user of allUsers) {
        // If user is designated as system admin, ensure they are in the Administrators group
        if (user.is_system_admin !== false) {
          await this.userGroupsService.ensureUserInAdminGroup(user._id);
        }

        // Check if user belongs to any user group
        const userPerms = await this.userGroupsService.getUserPermissions(user._id.toString());
        if (!userPerms.groups || userPerms.groups.length === 0) {
          // Auto-add ungrouped existing users to the default "Employee" group to prevent lockout
          await this.userGroupsService.ensureUserInEmployeeGroup(user._id);
          this.logger.log(`Auto-assigned existing ungrouped user ${user._id} (${user.email || user.name || 'Guest'}) to "Employee" group.`);
        }
      }
    } catch (err) {
      this.logger.error('Failed to initialize default groups / user migration', err);
    }
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async findByGuestId(guestId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ guestId }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = email.trim();
    return this.userModel.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    }).exec();
  }

  async createUser(userDto: Partial<User>): Promise<UserDocument> {
    if (userDto.email) {
      userDto.email = userDto.email.trim().toLowerCase();
    }
    const newUser = new this.userModel(userDto);
    const savedUser = await newUser.save();

    try {
      // Auto-add new users to default "Employee" group
      await this.userGroupsService.ensureUserInEmployeeGroup(savedUser._id);

      // If user was created with is_system_admin true, add to Administrators group
      if (savedUser.is_system_admin) {
        await this.userGroupsService.ensureUserInAdminGroup(savedUser._id);
      }
    } catch (groupErr) {
      this.logger.error(`Failed to assign default groups for user ${savedUser._id}`, groupErr);
    }

    return savedUser;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateUser(id: string, userDto: Partial<User>): Promise<UserDocument | null> {
    if (userDto.email) {
      userDto.email = userDto.email.trim().toLowerCase();
    }
    return this.userModel.findByIdAndUpdate(id, { $set: userDto }, { new: true }).exec();
  }

  async countSystemAdmins(): Promise<number> {
    return this.userModel.countDocuments({ is_system_admin: true }).exec();
  }

  async remove(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
