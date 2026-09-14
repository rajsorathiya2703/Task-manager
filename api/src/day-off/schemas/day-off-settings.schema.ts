import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DayOffSettings extends Document {
  @Prop({ default: 'admin@taskmanager.com', trim: true, lowercase: true })
  defaultAdminEmail: string;

  @Prop({ default: true })
  isEnabled: boolean;
}

export const DayOffSettingsSchema = SchemaFactory.createForClass(DayOffSettings);
