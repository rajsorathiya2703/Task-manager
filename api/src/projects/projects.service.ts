import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

import { Team } from '../teams/schemas/team.schema';
import { Employee } from '../employees/schemas/employee.schema';
import { Task } from '../tasks/schemas/task.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Team.name) private teamModel: Model<Team>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
  ) {}

  async create(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const createdProject = new this.projectModel({
      ...createProjectDto,
      userId,
      color: createProjectDto.color || '#3b82f6',
    });
    return createdProject.save();
  }

  async findAll(
    _userId?: string,
    _email?: string,
    _isSystemAdmin?: boolean,
    _scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Project[]> {
    return this.projectModel.find().populate('teamId').sort({ createdAt: -1 }).exec();
  }

  async findOne(
    id: string,
    _userId?: string,
    _email?: string,
    _isSystemAdmin?: boolean,
    _scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const project = await this.projectModel.findById(id).populate('teamId').exec();
    if (!project) return null;
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    _userId?: string,
    _email?: string,
    _isSystemAdmin?: boolean,
    _scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Project | null> {
    const updated = await this.projectModel.findByIdAndUpdate(id, updateProjectDto, { new: true }).populate('teamId').exec();
    if (!updated) {
      throw new NotFoundException('Project not found');
    }
    return updated;
  }

  async remove(
    id: string,
    _userId?: string,
    _email?: string,
    _isSystemAdmin?: boolean,
    _scope: 'own' | 'team' | 'all' = 'all',
  ): Promise<Project | null> {
    const deleted = await this.projectModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
    return deleted;
  }
}
