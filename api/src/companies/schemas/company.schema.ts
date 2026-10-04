import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class CompanySettings {
  @Prop({ default: false })
  requireCodeOnEveryLogin: boolean;
}

export const CompanySettingsSchema = SchemaFactory.createForClass(CompanySettings);

@Schema({ timestamps: true })
export class Company extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    minlength: 3,
    maxlength: 40,
  })
  slug: string;

  @Prop({ required: true, select: false })
  secretCodeHash: string;

  @Prop()
  industry?: string;

  @Prop({
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  })
  sizeRange?: string;

  @Prop()
  country?: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })
  workWeek: string[];

  @Prop({ type: Number, min: 1, max: 12, default: 1 })
  fiscalYearStart: number;

  @Prop()
  contactEmail?: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop()
  website?: string;

  @Prop()
  logoUrl?: string;

  @Prop({ type: CompanySettingsSchema, default: () => ({ requireCodeOnEveryLogin: false }) })
  settings: CompanySettings;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerUserId: Types.ObjectId;

  @Prop({ type: String, enum: ['active', 'suspended'], default: 'active' })
  status: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ slug: 1 }, { unique: true });
