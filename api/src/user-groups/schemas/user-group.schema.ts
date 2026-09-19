import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class FieldPermission {
  @Prop({ required: true })
  model: string; // 'tasks' | 'projects' | 'employees' | 'teams'

  @Prop({ required: true })
  field: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: false })
  write: boolean;

  @Prop({ default: false })
  update: boolean;

  @Prop({ default: false })
  delete: boolean;
}

export const FieldPermissionSchema = SchemaFactory.createForClass(FieldPermission);

@Schema({ _id: false })
export class ModulePermission {
  @Prop({ required: true })
  module: string; // Must match a key from PERMISSION_CATALOG

  @Prop({ default: false })
  create: boolean;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: false })
  update: boolean;

  @Prop({ default: false })
  delete: boolean;

  @Prop({ enum: ['own', 'team', 'all'], default: 'own' })
  scope: string;
}

export const ModulePermissionSchema = SchemaFactory.createForClass(ModulePermission);

@Schema({ _id: false })
export class OperationPermission {
  @Prop({ required: true })
  module: string; // Parent module key

  @Prop({ required: true })
  operation: string; // e.g. 'tasks.comments', 'dayoff.approvals'

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: false })
  write: boolean;

  @Prop({ default: false })
  update: boolean;

  @Prop({ default: false })
  delete: boolean;
}

export const OperationPermissionSchema = SchemaFactory.createForClass(OperationPermission);

@Schema({ timestamps: true })
export class UserGroup extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: '#6366f1' })
  color?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  members: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: [ModulePermissionSchema], default: [] })
  modulePermissions?: ModulePermission[];

  @Prop({ type: [OperationPermissionSchema], default: [] })
  operationPermissions?: OperationPermission[];

  @Prop({ type: [FieldPermissionSchema], default: [] })
  fieldPermissions?: FieldPermission[];
}

export const UserGroupSchema = SchemaFactory.createForClass(UserGroup);

// Index on members for fast lookups by userId
UserGroupSchema.index({ members: 1 });
