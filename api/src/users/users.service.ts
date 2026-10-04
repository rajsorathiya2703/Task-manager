import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Membership } from '../companies/schemas/membership.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
  ) {}

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

  async countSystemAdmins(): Promise<number> {
    return this.userModel.countDocuments({ is_system_admin: true }).exec();
  }

  async remove(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  // ────────── Company-scoped member methods (MC-31) ──────────

  /**
   * List all members of a company by joining Memberships with User.
   * Returns: name, email, avatarUrl, lastLoginAt, membership status, isCompanyOwner.
   * Never exposes googleId or guestId.
   */
  async listMembers(companyId: Types.ObjectId): Promise<any[]> {
    const memberships = await this.membershipModel
      .find({ companyId, status: { $in: ['active', 'suspended'] } })
      .lean()
      .exec();

    if (!memberships.length) return [];

    const userIds = memberships.map((m) => m.userId);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('name email avatarUrl lastLoginAt')
      .lean()
      .exec();

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    return memberships.map((m: any) => {
      const user = userMap.get(m.userId.toString()) || {};
      return {
        _id: m.userId,
        membershipId: m._id,
        name: (user as any).name || null,
        email: (user as any).email || null,
        avatarUrl: (user as any).avatarUrl || null,
        lastLoginAt: (user as any).lastLoginAt || null,
        membershipStatus: m.status,
        isCompanyOwner: m.isCompanyOwner || false,
        employeeId: m.employeeId || null,
        joinedAt: m.joinedAt,
      };
    });
  }

  /**
   * Get a single user by ID, but only if they have an active membership in the company.
   * Returns null if the user doesn't have a membership.
   */
  async getMemberById(
    companyId: Types.ObjectId,
    userId: string,
  ): Promise<any | null> {
    if (!Types.ObjectId.isValid(userId)) return null;

    const membership = await this.membershipModel
      .findOne({ companyId, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!membership) return null;

    const user = await this.userModel
      .findById(userId)
      .select('name email avatarUrl lastLoginAt')
      .lean()
      .exec();

    if (!user) return null;

    return {
      _id: (user as any)._id,
      membershipId: membership._id,
      name: (user as any).name || null,
      email: (user as any).email || null,
      avatarUrl: (user as any).avatarUrl || null,
      lastLoginAt: (user as any).lastLoginAt || null,
      membershipStatus: membership.status,
      isCompanyOwner: membership.isCompanyOwner || false,
      employeeId: membership.employeeId || null,
      joinedAt: membership.joinedAt,
    };
  }

  /**
   * Update a member's profile (name only for now).
   * Only allowed if the target user has a membership in the company.
   */
  async updateMemberProfile(
    companyId: Types.ObjectId,
    userId: string,
    dto: { name?: string },
  ): Promise<any | null> {
    if (!Types.ObjectId.isValid(userId)) return null;

    const membership = await this.membershipModel
      .findOne({ companyId, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!membership) return null;

    const updateFields: any = {};
    if (dto.name !== undefined) {
      updateFields.name = dto.name;
    }

    if (Object.keys(updateFields).length === 0) {
      // Nothing to update, return current state
      return this.getMemberById(companyId, userId);
    }

    await this.userModel.findByIdAndUpdate(userId, { $set: updateFields }).exec();
    return this.getMemberById(companyId, userId);
  }

  /**
   * Suspend/remove a membership. Does NOT delete the global User document.
   * Cannot remove the company owner.
   */
  async suspendMembership(
    companyId: Types.ObjectId,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, message: 'Invalid user ID' };
    }

    const membership = await this.membershipModel
      .findOne({ companyId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!membership) {
      return { success: false, message: 'not_found' };
    }

    if (membership.isCompanyOwner) {
      throw new BadRequestException(
        'Cannot remove the company owner. Transfer ownership first.',
      );
    }

    membership.status = 'suspended';
    await membership.save();

    return {
      success: true,
      message: `Membership for user ${userId} has been suspended.`,
    };
  }
}

