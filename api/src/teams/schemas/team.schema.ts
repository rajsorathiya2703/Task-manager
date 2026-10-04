import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Comment, CommentSchema } from '../../comments/schemas/comment.schema';
import { applyTenantPlugin } from '../../common/tenant.plugin';

// Re-export so existing imports of Comment from this file continue to work.
export { Comment, CommentSchema };

@Schema({ timestamps: true })
export class Team extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Employee' }] })
  members: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  teamLead?: Types.ObjectId;

  @Prop({ type: [CommentSchema], default: [] })
  comments?: Comment[];
}

export const TeamSchema = SchemaFactory.createForClass(Team);

applyTenantPlugin(TeamSchema);
