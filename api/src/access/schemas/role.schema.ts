import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// ModuleGrant — embedded sub-document (no own collection)
// ---------------------------------------------------------------------------

/**
 * Represents the CRUD + scope rights a role has on one application module.
 * Default for every boolean is false; scope defaults to 'none'.
 * This matches §5.1 › ModuleGrant in the access-control plan.
 */
@Schema({ _id: false })
export class ModuleGrant {
  /** Application module identifier, e.g. "tasks", "employees", "dayoff". */
  @Prop({ required: true, type: String })
  module: string;

  @Prop({ default: false })
  create: boolean;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: false })
  update: boolean;

  @Prop({ default: false })
  delete: boolean;

  /**
   * Which records this grant applies to.
   * Scope ranks: none (0) < own (1) < team (2) < all (3).
   * When merging multiple roles, widest scope wins.
   */
  @Prop({
    type: String,
    enum: ['none', 'own', 'team', 'all'],
    default: 'none',
  })
  scope: 'none' | 'own' | 'team' | 'all';

  /**
   * Optional extra operations beyond CRUD, e.g. "tasks.timer", "dayoff.approve".
   * Union of all roles' operations arrays when merging.
   */
  @Prop({ type: [String], default: [] })
  operations: string[];
}

export const ModuleGrantSchema = SchemaFactory.createForClass(ModuleGrant);

// ---------------------------------------------------------------------------
// FieldGrant — embedded sub-document (no own collection)
// ---------------------------------------------------------------------------

/**
 * Per-field read / update rights for a specific module.
 * Opt-out model: if a field is NOT listed, it inherits from the module grant.
 * This matches §5.1 › FieldGrant in the access-control plan.
 *
 * Invariant enforced by the PDP at runtime:
 *   field.read   ⊆ module.read
 *   field.update ⊆ module.update ∩ field.read
 */
@Schema({ _id: false })
export class FieldGrant {
  /** Module the field belongs to, e.g. "tasks", "employees". */
  @Prop({ required: true, type: String })
  module: string;

  /** Field name on the module's model, e.g. "priority", "baseSalary". */
  @Prop({ required: true, type: String })
  field: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: false })
  update: boolean;
}

export const FieldGrantSchema = SchemaFactory.createForClass(FieldGrant);

// ---------------------------------------------------------------------------
// Role — top-level collection ("roles")
// ---------------------------------------------------------------------------

export type RoleDocument = Role & Document;

/**
 * A named bundle of module grants + field grants with a priority rank.
 * Users can belong to many roles; effective rights are the union of all grants.
 * System roles (isSystem = true) cannot be deleted.
 * This matches §5.1 › roles in the access-control plan.
 */
@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  /** The tenant / company this role belongs to. */
  @Prop({ type: Types.ObjectId, ref: 'Company', index: true })
  companyId?: Types.ObjectId;

  /** Human-readable display name, e.g. "Manager". Unique per company. */
  @Prop({ required: true, type: String })
  name: string;

  /**
   * URL-safe machine identifier derived from the name, e.g. "manager".
   * Used as a stable key in the compiled policy document. Unique per company.
   */
  @Prop({ required: true, type: String })
  slug: string;

  @Prop({ type: String })
  description?: string;

  /** Optional hex color for the role badge in the UI, e.g. "#6366f1". */
  @Prop({ type: String })
  color?: string;

  /**
   * Higher number = higher rank.
   * Used for: display order, primary-role badge, and future explicit DENY resolution.
   * Permissions themselves are always additive (OR across roles).
   *
   * Recommended values: System Admin 1000, Admin 100, Manager 60,
   * Team Leader 40, Employee 10.
   */
  @Prop({ required: true, default: 0, type: Number })
  priority: number;

  /**
   * Seed roles created during bootstrap cannot be deleted through the API.
   * They can still be edited (grants and members can change).
   */
  @Prop({ default: false })
  isSystem: boolean;

  @Prop({ default: true })
  isActive: boolean;

  /**
   * User ObjectIds that hold this role within this company.
   * Kept in sync with Membership.roleIds for the company.
   */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  /** Module-level CRUD + scope grants. One entry per module. */
  @Prop({ type: [ModuleGrantSchema], default: [] })
  moduleGrants: ModuleGrant[];

  /**
   * Per-field read / update overrides.
   * If a field is absent, it inherits from the corresponding ModuleGrant.
   */
  @Prop({ type: [FieldGrantSchema], default: [] })
  fieldGrants: FieldGrant[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Compound index: unique slug and name per company
RoleSchema.index({ companyId: 1, slug: 1 }, { unique: true });
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Compound index: fast look-up of all roles a specific user belongs to within a company
RoleSchema.index({ companyId: 1, members: 1 });
RoleSchema.index({ members: 1 });
