import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Company extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  industry: string;

  @Prop({
    required: true,
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
  })
  employeeCount: string;

  @Prop()
  website?: string;

  @Prop()
  phone?: string;

  @Prop()
  country?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerUserId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['trial', 'active', 'expired'],
    default: 'trial',
  })
  plan: string;

  @Prop({ type: Date, required: true })
  trialEndsAt: Date;

  // Compatibility fields for existing multi-company services
  @Prop({ select: false })
  secretCodeHash: string;

  @Prop()
  sizeRange?: string;

  @Prop()
  status?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  contactEmail?: string;

  @Prop()
  timezone?: string;

  @Prop()
  currency?: string;

  @Prop({ type: [String] })
  workWeek?: string[];

  @Prop()
  fiscalYearStart?: number;

  @Prop()
  address?: string;

  @Prop({ type: Object })
  settings?: any;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ slug: 1 }, { unique: true });
