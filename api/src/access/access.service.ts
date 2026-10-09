import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PolicyCompilerService } from './policy-compiler.service';
import { PolicyEngineService } from './policy-engine.service';
import { MODULE_CATALOG, ModuleDef } from './catalog';
import { Subject, ScopeType } from './policy.engine';
import { Membership } from '../companies/schemas/membership.schema';

/**
 * Role summary returned in the effective access payload.
 */
export interface EffectiveRole {
  id: string;
  name: string;
  slug: string;
  priority: number;
  color?: string;
}

/**
 * Per-field read and update permissions.
 */
export interface EffectiveFieldAccess {
  read: boolean;
  update: boolean;
}

/**
 * Per-module effective permissions.
 * Matches §10.1 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export interface EffectiveModuleAccess {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  scope: ScopeType;
  fields: Record<string, EffectiveFieldAccess>;
}

/**
 * Complete effective access payload returned on session fetch (GET /auth/me).
 * Matches §10.1 of ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export interface EffectiveAccessResult {
  roles: EffectiveRole[];
  policyVersion: number;
  access: Record<string, EffectiveModuleAccess>;
}

/**
 * AccessService (Phase 1 — P1-02 & P1-03)
 *
 * Computes a user's merged effective permissions across all catalog modules
 * and fields based on the latest compiled policy document snapshot.
 */
@Injectable()
export class AccessService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly policyCompilerService: PolicyCompilerService,
    private readonly policyEngineService: PolicyEngineService,
    @Optional()
    @InjectModel(Membership.name)
    private readonly membershipModel?: Model<any>,
  ) {}

  /**
   * Calculates the full effective access shape (§10.1) for a given user ID,
   * scoped to an optional companyId.
   */
  async getEffectiveAccess(
    userId: string,
    companyId?: string | Types.ObjectId,
  ): Promise<EffectiveAccessResult> {
    const compObjectId =
      companyId && Types.ObjectId.isValid(companyId)
        ? new Types.ObjectId(companyId)
        : undefined;

    const roleQuery: any = { members: userId, isActive: true };
    if (compObjectId) {
      roleQuery.companyId = compObjectId;
    }

    const membershipPromise =
      compObjectId && this.membershipModel
        ? this.membershipModel
            .findOne({
              userId: new Types.ObjectId(userId),
              companyId: compObjectId,
              status: 'active',
            })
            .lean()
            .exec()
        : Promise.resolve(null);

    const [user, initialUserRoles, policyDoc, membership] = await Promise.all([
      this.userModel.findById(userId).lean().exec(),
      this.roleModel.find(roleQuery).lean().exec(),
      this.policyCompilerService.getLatestPolicyDocument(compObjectId),
      membershipPromise,
    ]);

    let userRoles = initialUserRoles;
    // If no roles found directly via role.members, check membership.roleIds
    if (
      userRoles.length === 0 &&
      membership &&
      membership.roleIds &&
      membership.roleIds.length > 0
    ) {
      const roleObjIds = membership.roleIds
        .filter((r: any) => Types.ObjectId.isValid(r))
        .map((r: any) => new Types.ObjectId(r));
      userRoles = await this.roleModel
        .find({ _id: { $in: roleObjIds }, isActive: true })
        .lean()
        .exec();
    }

    const plainPolicy = policyDoc
      ? typeof (policyDoc as any).toObject === 'function'
        ? (policyDoc as any).toObject()
        : policyDoc
      : undefined;

    const policyVersion = plainPolicy?.version ?? 0;
    const isSystemAdmin =
      user?.is_system_admin === true ||
      membership?.isCompanyOwner === true ||
      membership?.isSystemAdmin === true;

    // Build subject for PDP evaluation
    const subject: Subject = {
      userId,
      email: user?.email,
      roleIds: userRoles.map((r) => r._id.toString()),
      roles: userRoles.map((r) => r.slug),
      isSystemAdmin,
    };

    // Sort user roles descending by priority
    const formattedRoles: EffectiveRole[] = userRoles
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((r) => ({
        id: r._id.toString(),
        name: r.name,
        slug: r.slug,
        priority: r.priority,
        color: r.color,
      }));

    // Defensive: if user has is_system_admin flag, guarantee system-admin appears in roles
    if (
      isSystemAdmin &&
      !formattedRoles.some(
        (r) => r.slug === 'system-admin' || r.priority >= 1000,
      )
    ) {
      const sysAdminRole = plainPolicy?.roles?.find(
        (r: any) => r.slug === 'system-admin' || r.priority >= 1000,
      );
      if (sysAdminRole) {
        formattedRoles.unshift({
          id: sysAdminRole.id || 'system-admin',
          name: sysAdminRole.name || 'System Admin',
          slug: sysAdminRole.slug || 'system-admin',
          priority: sysAdminRole.priority ?? 1000,
          color: sysAdminRole.color || '#ef4444',
        });
      }
    }

    const catalog: ModuleDef[] =
      plainPolicy?.moduleCatalog && plainPolicy.moduleCatalog.length > 0
        ? (plainPolicy.moduleCatalog as unknown as ModuleDef[])
        : MODULE_CATALOG;

    const access: Record<string, EffectiveModuleAccess> = {};

    for (const mod of catalog) {
      const readDecision = this.policyEngineService.can(
        subject,
        'read',
        mod.id,
        undefined,
        plainPolicy,
      );

      const createDecision = this.policyEngineService.can(
        subject,
        'create',
        mod.id,
        undefined,
        plainPolicy,
      );

      const updateDecision = this.policyEngineService.can(
        subject,
        'update',
        mod.id,
        undefined,
        plainPolicy,
      );

      const deleteDecision = this.policyEngineService.can(
        subject,
        'delete',
        mod.id,
        undefined,
        plainPolicy,
      );

      const fields: Record<string, EffectiveFieldAccess> = {};
      const catalogFields = mod.fields ?? [];

      for (const field of catalogFields) {
        fields[field.key] = {
          read: readDecision.readableFields.includes(field.key),
          update: readDecision.updatableFields.includes(field.key),
        };
      }

      // Also capture any non-catalog fields present in role grants
      for (const fieldKey of readDecision.readableFields) {
        if (!fields[fieldKey]) {
          fields[fieldKey] = {
            read: true,
            update: readDecision.updatableFields.includes(fieldKey),
          };
        }
      }

      access[mod.id] = {
        create: createDecision.allow,
        read: readDecision.allow,
        update: updateDecision.allow,
        delete: deleteDecision.allow,
        scope: readDecision.allow ? readDecision.scope : 'none',
        fields,
      };
    }

    return {
      roles: formattedRoles,
      policyVersion,
      access,
    };
  }
}
