import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessModule } from '../access/access.module';
import { CompaniesModule } from '../companies/companies.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    AccessModule,
    forwardRef(() => CompaniesModule),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
