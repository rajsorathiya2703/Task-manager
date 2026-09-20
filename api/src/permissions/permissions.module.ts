import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsController } from './permissions.controller';
import { PermissionCacheService } from './permission-cache.service';
import { AccessScopeService } from './access-scope.service';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionCacheService, AccessScopeService],
  exports: [PermissionCacheService, AccessScopeService],
})
export class PermissionsModule {}

