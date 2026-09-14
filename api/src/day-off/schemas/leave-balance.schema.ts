import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LeaveBalance extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId: Types.ObjectId;

  @Prop({ required: true })
  year: number;

  @Prop({ default: 0 })
  allocated: number;

  @Prop({ default: 0 })
  used: number;

  @Prop({ default: 0 })
  carriedForward: number;
}

export const LeaveBalanceSchema = SchemaFactory.createForClass(LeaveBalance);
