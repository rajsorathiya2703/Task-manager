import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applyTenantPlugin } from '../../common/tenant.plugin';

@Schema({ timestamps: true })
export class ProjectUpdate {
  @Prop({ type: Object })
  user?: {
    name: string;
    avatarUrl?: string;
    email?: string;
  };

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ProjectUpdateSchema = SchemaFactory.createForClass(ProjectUpdate);

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

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

  @Prop({ type: [ProjectUpdateSchema], default: [] })
  updates?: ProjectUpdate[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ companyId: 1, status: 1 });

applyTenantPlugin(ProjectSchema);

