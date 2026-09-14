import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LeaveType extends Document {
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

  @Prop({ type: [{ type: Types.ObjectId, ref: 'UserGroup' }], default: [] })
  applicableUserGroups: Types.ObjectId[];

  @Prop({ default: '' })
  rules: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const LeaveTypeSchema = SchemaFactory.createForClass(LeaveType);
