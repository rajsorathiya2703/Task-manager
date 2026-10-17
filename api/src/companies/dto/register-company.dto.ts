import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsOptional()
  employeeCount?: string | number;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
