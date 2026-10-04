import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './schemas/task.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { EmailService } from './email.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Team, TeamSchema } from '../teams/schemas/team.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { CommentsModule } from '../comments/comments.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CloudinaryModule,
    CommentsModule,
    CompaniesModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, EmailService],
})
export class TasksModule {}

