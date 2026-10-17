import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
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
    enum: ['trial', 'active', 'expired', 'suspended'],
    default: 'trial',
    index: true,
  })
  plan: string;

  @Prop({ type: Date })
  trialStartedAt?: Date;

  @Prop({ type: Date, required: true })
  trialEndsAt: Date;

  @Prop({ type: Date })
  convertedAt?: Date;

  @Prop()
  accessGrantedBy?: string;

  @Prop({ type: Date })
  accessGrantedAt?: Date;

  @Prop({ index: true, lowercase: true, trim: true })
  contactEmail?: string;

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

  // Virtual alias for plan
  get subscriptionStatus(): string {
    return this.plan;
  }
  set subscriptionStatus(val: string) {
    this.plan = val;
  }
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.virtual('subscriptionStatus')
  .get(function () {
    return this.plan;
  })
  .set(function (val: string) {
    this.plan = val;
  });

CompanySchema.index({ plan: 1 });
CompanySchema.index({ contactEmail: 1 });
