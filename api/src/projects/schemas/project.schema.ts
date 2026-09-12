import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, default: 'To Do' })
  status: string;

  @Prop({ required: true, default: 'Medium' })
  priority: string;

  @Prop()
  startDate?: string;

  @Prop()
  dueDate?: string;

  @Prop({ default: '#3b82f6' })
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId?: Types.ObjectId;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
