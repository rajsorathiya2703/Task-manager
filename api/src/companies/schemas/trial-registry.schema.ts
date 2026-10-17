import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TrialRegistry extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  normalizedEmail: string;

  @Prop({ required: true, trim: true })
  originalEmail: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const TrialRegistrySchema = SchemaFactory.createForClass(TrialRegistry);

TrialRegistrySchema.index({ normalizedEmail: 1 }, { unique: true });
