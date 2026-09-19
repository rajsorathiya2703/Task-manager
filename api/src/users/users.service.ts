import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * On startup, synchronize is_system_admin based on the SYSTEM_ADMIN_EMAILS env var.
   *
   * 1. Users whose email matches → is_system_admin = true
   * 2. All other users → is_system_admin = false
   * 3. Also adds matching admins to the "Administrators" user group.
   *
   * This replaces the old bootstrap that set is_system_admin = true for everyone.
   */
  async onApplicationBootstrap() {
    const adminEmailsRaw = this.configService.get<string>('SYSTEM_ADMIN_EMAILS') || '';
    const adminEmails = adminEmailsRaw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (adminEmails.length === 0) {
      this.logger.warn(
        'SYSTEM_ADMIN_EMAILS is not set or empty. No users will be system admins. ' +
        'Set SYSTEM_ADMIN_EMAILS in .env to a comma-separated list of admin emails.',
      );
      // Set all users to non-admin (safe default)
      const res = await this.userModel.updateMany(
        { is_system_admin: true },
        { $set: { is_system_admin: false } },
      );
      if (res.modifiedCount > 0) {
        this.logger.log(`Revoked is_system_admin from ${res.modifiedCount} user(s) (no admin emails configured).`);
      }
      return;
    }

    this.logger.log(`System admin emails from env: ${adminEmails.join(', ')}`);

    // Promote matching users
    const promoteResult = await this.userModel.updateMany(
      { email: { $in: adminEmails }, is_system_admin: { $ne: true } },
      { $set: { is_system_admin: true } },
    );
    if (promoteResult.modifiedCount > 0) {
      this.logger.log(`Promoted ${promoteResult.modifiedCount} user(s) to system admin.`);
    }

    // Demote non-matching users
    const demoteResult = await this.userModel.updateMany(
      { email: { $nin: adminEmails }, is_system_admin: true },
      { $set: { is_system_admin: false } },
    );
    if (demoteResult.modifiedCount > 0) {
      this.logger.log(`Demoted ${demoteResult.modifiedCount} user(s) from system admin.`);
    }

    // Also ensure users without the field get the default (false)
    await this.userModel.updateMany(
      { is_system_admin: { $exists: false } },
      { $set: { is_system_admin: false } },
    );

    // Auto-add admin users to the "Administrators" group
    try {
      const mongoose = require('mongoose');
      const UserGroupModel = mongoose.connection.model('UserGroup');
      if (UserGroupModel) {
        const adminGroup = await UserGroupModel.findOne({ name: 'Administrators' }).exec();
        if (adminGroup) {
          const adminUsers = await this.userModel.find({ email: { $in: adminEmails } }).exec();
          for (const adminUser of adminUsers) {
            const userId = adminUser._id;
            const alreadyMember = adminGroup.members.some(
              (m: any) => m.toString() === userId.toString(),
            );
            if (!alreadyMember) {
              await UserGroupModel.findByIdAndUpdate(adminGroup._id, {
                $addToSet: { members: userId },
              });
              this.logger.log(`Added admin user ${adminUser.email} to "Administrators" group.`);
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Could not auto-add admins to Administrators group: ${err}`);
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
    return newUser.save();
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

  async remove(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
