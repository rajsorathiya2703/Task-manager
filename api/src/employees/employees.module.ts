import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => CompaniesModule),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
