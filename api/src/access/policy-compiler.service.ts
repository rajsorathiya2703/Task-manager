import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import {
  PolicyDocument,
  PolicyDocumentDoc,
} from './schemas/policy-document.schema';
import {
  compile,
  CompiledPolicyDocument,
  RoleLike,
  ModuleDef,
} from './policy.compiler';
import { MODULE_CATALOG } from './catalog';

/**
 * PolicyCompilerService (Phase 0 — P0-06)
 *
 * Injectable NestJS service wrapping the pure compile() function and
 * providing MongoDB persistence helpers for compiled policy documents.
 */
@Injectable()
export class PolicyCompilerService {
  private readonly logger = new Logger(PolicyCompilerService.name);

  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(PolicyDocument.name)
    private readonly policyDocModel: Model<PolicyDocumentDoc>,
  ) {}

  /**
   * Pure compilation wrapper.
   */
  compile(
    roles: RoleLike[],
    catalog: ModuleDef[] = MODULE_CATALOG,
    prevVersion = 0,
  ): CompiledPolicyDocument {
    return compile(roles, catalog, prevVersion);
  }

  /**
   * Fetches the latest compiled policy document from MongoDB (descending version),
   * optionally scoped to a specific company.
   */
  async getLatestPolicyDocument(
    companyId?: string | Types.ObjectId,
  ): Promise<PolicyDocumentDoc | null> {
    if (companyId) {
      const compObjectId = Types.ObjectId.isValid(companyId)
        ? new Types.ObjectId(companyId)
        : companyId;
      const companyDoc = await this.policyDocModel
        .findOne({ companyId: compObjectId })
        .sort({ version: -1 })
        .exec();
      if (companyDoc) return companyDoc;
    }

    // Fallback to global / unassigned policy document
    return this.policyDocModel
      .findOne({
        $or: [{ companyId: { $exists: false } }, { companyId: null }],
      })
      .sort({ version: -1 })
      .exec();
  }

  /**
   * Reads all active roles for the specified company (or globally if no companyId),
   * compiles a new snapshot, increments version, and persists to policy_documents collection.
   */
  async compileAndPersist(
    companyId?: string | Types.ObjectId,
    catalog: ModuleDef[] = MODULE_CATALOG,
  ): Promise<PolicyDocumentDoc> {
    const compObjectId =
      companyId && Types.ObjectId.isValid(companyId)
        ? new Types.ObjectId(companyId)
        : undefined;

    const latestDoc = await this.policyDocModel
      .findOne(compObjectId ? { companyId: compObjectId } : { $or: [{ companyId: { $exists: false } }, { companyId: null }] })
      .sort({ version: -1 })
      .exec();
    const prevVersion = latestDoc?.version ?? 0;

    const query: any = { isActive: true };
    if (compObjectId) {
      query.companyId = compObjectId;
    } else {
      query.$or = [{ companyId: { $exists: false } }, { companyId: null }];
    }

    const activeRoles = await this.roleModel.find(query).lean().exec();

    const compiled = compile(activeRoles as unknown as RoleLike[], catalog, prevVersion);

    const created = (await this.policyDocModel.create({
      ...(compiled as any),
      ...(compObjectId ? { companyId: compObjectId } : {}),
    })) as PolicyDocumentDoc;

    this.logger.log(
      `Compiled policy document v${created.version} with ${compiled.roles.length} roles for company ${compObjectId ? compObjectId.toString() : 'GLOBAL'} (hash: ${created.hash.slice(0, 8)}...)`,
    );

    return created;
  }
}
