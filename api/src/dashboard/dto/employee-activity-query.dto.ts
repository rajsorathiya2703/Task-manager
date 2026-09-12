import { IsOptional, IsString, IsIn } from 'class-validator';

export class EmployeeActivityQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'monthly'])
  range?: 'weekly' | 'monthly';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  year?: string;
}
