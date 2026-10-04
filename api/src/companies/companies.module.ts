import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { Membership, MembershipSchema } from './schemas/membership.schema';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TenantGuard } from '../common/tenant.guard';
import { TenantInterceptor } from '../common/tenant.interceptor';
import { EmployeesModule } from '../employees/employees.module';
import { UsersModule } from '../users/users.module';
import { DayOffModule } from '../day-off/day-off.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
    forwardRef(() => EmployeesModule),
    forwardRef(() => DayOffModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, TenantGuard, TenantInterceptor],
  exports: [CompaniesService, TenantGuard, TenantInterceptor, MongooseModule],
})
export class CompaniesModule {}
