import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Membership extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  employeeId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roleIds: Types.ObjectId[];

  @Prop({ default: false })
  isCompanyOwner: boolean;

  @Prop({ default: false })
  isSystemAdmin: boolean;

  @Prop({ type: String, enum: ['active', 'suspended'], default: 'active' })
  status: string;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

MembershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });
MembershipSchema.index({ companyId: 1, status: 1 });
