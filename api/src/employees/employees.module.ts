import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';
import { Membership, MembershipSchema } from '../companies/schemas/membership.schema';
import { CompanyMember, CompanyMemberSchema } from '../companies/schemas/company-member.schema';
import { Role, RoleSchema } from '../access/schemas/role.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => CompaniesModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
