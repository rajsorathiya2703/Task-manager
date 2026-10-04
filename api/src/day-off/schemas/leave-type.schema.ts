import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applyTenantPlugin } from '../../common/tenant.plugin';

@Schema({ timestamps: true })
export class LeaveType extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, uppercase: true })
  code: string;

  @Prop({ default: '#3B82F6' })
  color: string;

  @Prop({ default: false })
  canCarryForward: boolean;

  @Prop({ default: 0 })
  carryForwardLimit: number;

  @Prop({ default: 0, min: 0, max: 100 })
  salaryDeductionPercent: number;

  @Prop({ default: 'yearly', enum: ['monthly', 'quarterly', 'yearly'] })
  refillCycle: string;

  @Prop({ default: 12, min: 0 })
  defaultAllocation: number;

  @Prop({ default: '' })
  rules: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const LeaveTypeSchema = SchemaFactory.createForClass(LeaveType);

LeaveTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });

applyTenantPlugin(LeaveTypeSchema);
