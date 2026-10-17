import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import {
  CompanyMember,
  CompanyMemberSchema,
} from './schemas/company-member.schema';
import {
  TrialRegistry,
  TrialRegistrySchema,
} from './schemas/trial-registry.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Role, RoleSchema } from '../access/schemas/role.schema';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminGuard } from './platform-admin.guard';
import { TenantGuard } from '../common/tenant.guard';
import { TenantInterceptor } from '../common/tenant.interceptor';
import { EmployeesModule } from '../employees/employees.module';
import { DayOffModule } from '../day-off/day-off.module';
import { UsersModule } from '../users/users.module';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: TrialRegistry.name, schema: TrialRegistrySchema },
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    forwardRef(() => EmployeesModule),
    forwardRef(() => DayOffModule),
    forwardRef(() => UsersModule),
    forwardRef(() => AccessModule),
  ],
  controllers: [CompaniesController, PlatformAdminController],
  providers: [
    CompaniesService,
    PlatformAdminService,
    PlatformAdminGuard,
    TenantGuard,
    TenantInterceptor,
  ],
  exports: [
    CompaniesService,
    PlatformAdminService,
    PlatformAdminGuard,
    TenantGuard,
    TenantInterceptor,
    MongooseModule,
  ],
})
export class CompaniesModule {}
