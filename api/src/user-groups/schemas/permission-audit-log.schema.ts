import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditAction =
  | 'group_created'
  | 'group_updated'
  | 'group_deleted'
  | 'member_added'
  | 'member_removed'
  | 'system_admin_toggled';

@Schema({ timestamps: true })
export class PermissionAuditLog extends Document {
  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  actorEmail: string;

  @Prop({
    required: true,
    enum: [
      'group_created',
      'group_updated',
      'group_deleted',
      'member_added',
      'member_removed',
      'system_admin_toggled',
    ],
  })
  action: AuditAction;

  @Prop({ type: Types.ObjectId, ref: 'UserGroup' })
  groupId?: Types.ObjectId;

  @Prop()
  groupName?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  targetUserId?: Types.ObjectId;

  @Prop()
  targetUserEmail?: string;

  @Prop({ type: Object })
  before?: Record<string, any>;

  @Prop({ type: Object })
  after?: Record<string, any>;

  @Prop()
  details?: string;
}

export const PermissionAuditLogSchema = SchemaFactory.createForClass(PermissionAuditLog);

PermissionAuditLogSchema.index({ groupId: 1, createdAt: -1 });
PermissionAuditLogSchema.index({ targetUserId: 1, createdAt: -1 });
PermissionAuditLogSchema.index({ createdAt: -1 });
