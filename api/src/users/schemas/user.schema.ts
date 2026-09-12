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

  @Prop({ default: false })
  is_employee: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
