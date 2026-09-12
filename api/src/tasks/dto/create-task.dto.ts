import { IsString, IsOptional, IsArray, IsObject, IsNumber } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsOptional()
  members?: { email: string; name?: string; status: 'invited' | 'joined' }[];

  @IsOptional()
  assignee?: any;

  @IsOptional()
  assignedBy?: any;

  @IsArray()
  @IsOptional()
  resources?: { name: string; url: string; type: 'link' | 'file' }[];

  @IsString()
  @IsOptional()
  projectId?: string;
}
