import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import {
  PolicyDocument,
  PolicyDocumentSchema,
} from './schemas/policy-document.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PolicyCompilerService } from './policy-compiler.service';
import { PolicyEngineService } from './policy-engine.service';
import { AccessSeedService } from './access.seed';
import { AccessGuard } from './access.guard';
import { AccessService } from './access.service';
import { FieldAccessInterceptor } from './field-access.interceptor';
import { AccessController } from './access.controller';

import { Membership, MembershipSchema } from '../companies/schemas/membership.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';

/**
 * AccessModule (Phase 0 — P0-06 & P0-07, Phase 1 — P1-02 & P1-03, Phase 2 — P2-01, Phase 3 — P3-10)
 *
 * Registers the Role, PolicyDocument, User, Membership, and Company schemas with Mongoose,
 * provides PolicyCompilerService, PolicyEngineService, AccessSeedService,
 * AccessGuard, AccessService, and FieldAccessInterceptor.
 * Exposes AccessController with the /access/preview/:userId endpoint.
 * Automatically triggers seedDefaultRoles() onModuleInit.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: PolicyDocument.name, schema: PolicyDocumentSchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [AccessController],
  providers: [
    PolicyCompilerService,
    PolicyEngineService,
    AccessSeedService,
    AccessGuard,
    AccessService,
    FieldAccessInterceptor,
  ],
  exports: [
    MongooseModule,
    PolicyCompilerService,
    PolicyEngineService,
    AccessSeedService,
    AccessGuard,
    AccessService,
    FieldAccessInterceptor,
  ],
})
export class AccessModule implements OnModuleInit {
  constructor(private readonly accessSeedService: AccessSeedService) {}

  async onModuleInit(): Promise<void> {
    await this.accessSeedService.seedDefaultRoles();
  }
}
