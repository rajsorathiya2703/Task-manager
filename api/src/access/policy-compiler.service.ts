import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
   * Fetches the latest compiled policy document from MongoDB (descending version).
   */
  async getLatestPolicyDocument(): Promise<PolicyDocumentDoc | null> {
    return this.policyDocModel.findOne().sort({ version: -1 }).exec();
  }

  /**
   * Reads all active roles from the database, compiles a new snapshot,
   * increments version, and persists to the policy_documents collection.
   */
  async compileAndPersist(
    catalog: ModuleDef[] = MODULE_CATALOG,
  ): Promise<PolicyDocumentDoc> {
    const latestDoc = await this.getLatestPolicyDocument();
    const prevVersion = latestDoc?.version ?? 0;

    const activeRoles = await this.roleModel.find({ isActive: true }).lean().exec();

    const compiled = compile(activeRoles as unknown as RoleLike[], catalog, prevVersion);

    const created = (await this.policyDocModel.create(
      compiled as any,
    )) as PolicyDocumentDoc;
    this.logger.log(
      `Compiled policy document v${created.version} with ${compiled.roles.length} roles (hash: ${created.hash.slice(0, 8)}...)`,
    );

    return created;
  }
}
