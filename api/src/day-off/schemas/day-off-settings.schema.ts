import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applyTenantPlugin } from '../../common/tenant.plugin';

@Schema({ timestamps: true })
export class DayOffSettings extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ default: 'admin@taskmanager.com', trim: true, lowercase: true })
  defaultAdminEmail: string;

  @Prop({ default: true })
  isEnabled: boolean;
}

export const DayOffSettingsSchema = SchemaFactory.createForClass(DayOffSettings);

DayOffSettingsSchema.index({ companyId: 1 }, { unique: true });

applyTenantPlugin(DayOffSettingsSchema);
