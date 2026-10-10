import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CompanyMember extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  })
  role: string;
}

export const CompanyMemberSchema = SchemaFactory.createForClass(CompanyMember);

CompanyMemberSchema.index({ companyId: 1, userId: 1 }, { unique: true });
CompanyMemberSchema.index({ userId: 1 });
