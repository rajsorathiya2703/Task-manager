import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ModuleGrantDto {
  @IsString()
  module: string;

  @IsBoolean()
  @IsOptional()
  create?: boolean;

  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsBoolean()
  @IsOptional()
  update?: boolean;

  @IsBoolean()
  @IsOptional()
  delete?: boolean;

  @IsIn(['none', 'own', 'team', 'all'])
  @IsOptional()
  scope?: 'none' | 'own' | 'team' | 'all';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operations?: string[];
}

export class FieldGrantDto {
  @IsString()
  module: string;

  @IsString()
  field: string;

  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsBoolean()
  @IsOptional()
  update?: boolean;
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  members?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleGrantDto)
  @IsOptional()
  moduleGrants?: ModuleGrantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldGrantDto)
  @IsOptional()
  fieldGrants?: FieldGrantDto[];
}
