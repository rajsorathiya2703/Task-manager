import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, enum: ['guest', 'google'] })
  authType: string;

  @Prop({ sparse: true, unique: true })
  googleId?: string;

  @Prop({ sparse: true, unique: true })
  guestId?: string;

  @Prop({ sparse: true, unique: true })
  email?: string;

  @Prop()
  name?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  lastLoginAt: Date;

  /**
   * @deprecated Retired in MC-34. Employment status is company-scoped via Membership / Employee records.
   */
  @Prop({ default: false })
  is_employee: boolean;

  /**
   * @deprecated Retired in MC-34. Replaced by Membership.isSystemAdmin / Membership.isCompanyOwner (and future PBAC).
   */
  @Prop({ default: false })
  is_system_admin: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
