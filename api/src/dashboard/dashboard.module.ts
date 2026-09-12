import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
