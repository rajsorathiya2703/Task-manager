import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onApplicationBootstrap() {
    try {
      const res = await this.userModel.updateMany(
        { is_system_admin: { $exists: false } },
        { $set: { is_system_admin: true } },
      );
      if (res.modifiedCount > 0) {
        this.logger.log(`Initialized default is_system_admin=true for ${res.modifiedCount} user(s).`);
      }
    } catch (err) {
      this.logger.error('Failed to initialize default is_system_admin for users', err);
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
