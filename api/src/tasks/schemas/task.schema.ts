import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Comment, CommentSchema } from '../../comments/schemas/comment.schema';

// Re-export so existing imports of Comment from this file continue to work.
export { Comment, CommentSchema };

@Schema({ timestamps: true })
export class TaskUpdate {
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  assigneeId?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  user: {
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

export const TaskUpdateSchema = SchemaFactory.createForClass(TaskUpdate);

@Schema({ timestamps: true })
export class TimeEntry {
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  assigneeId?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  user: {
    name: string;
    avatarUrl?: string;
    email?: string;
  };

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  stopTime: Date;

  @Prop({ required: true })
  durationSeconds: number;
}

export const TimeEntrySchema = SchemaFactory.createForClass(TimeEntry);

@Schema({ timestamps: true })
export class Task extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, default: 'To Do' })
  status: string;

  @Prop({ required: true, default: 'Medium' })
  priority: string;

  @Prop()
  startDate?: string;

  @Prop()
  dueDate: string;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop([String])
  tags: string[];

  @Prop({ type: Number, default: 0 })
  estimatedHours?: number;

  @Prop({ type: Boolean, default: false })
  isTimerRunning?: boolean;

  @Prop({ type: Date })
  timerStartedAt?: Date;

  @Prop({ type: Object })
  timerUser?: {
    name: string;
    email?: string;
    avatarUrl?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  assignee?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  assignedBy?: Types.ObjectId;

  @Prop({ type: [{ email: String, name: String, status: String }], default: [] })
  members?: { email: string; name?: string; status: string }[];

  @Prop([{ name: String, url: String, type: { type: String, enum: ['link', 'file'] } }])
  resources?: { name: string; url: string; type: 'link' | 'file' }[];

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId;

  @Prop({ type: [CommentSchema], default: [] })
  comments?: Comment[];

  @Prop({ type: [TaskUpdateSchema], default: [] })
  updates?: TaskUpdate[];

  @Prop({ type: [TimeEntrySchema], default: [] })
  timeEntries?: TimeEntry[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);

