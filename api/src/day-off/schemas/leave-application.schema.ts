import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applyTenantPlugin } from '../../common/tenant.plugin';

@Schema({ timestamps: true })
export class LeaveApplication extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId: Types.ObjectId;

  @Prop({ required: true })
  fromDate: Date;

  @Prop({ required: true })
  toDate: Date;

  @Prop({ default: 1 })
  daysCount: number;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status: string;

  @Prop({ default: '' })
  approvalToken: string;

  @Prop({ default: false })
  tokenUsed: boolean;

  @Prop()
  approvedAt?: Date;

  @Prop({ default: '' })
  approvedBy?: string;

  @Prop({ default: '' })
  rejectionReason?: string;
}

export const LeaveApplicationSchema = SchemaFactory.createForClass(LeaveApplication);

LeaveApplicationSchema.index({ companyId: 1, employeeId: 1, status: 1 });

applyTenantPlugin(LeaveApplicationSchema);
