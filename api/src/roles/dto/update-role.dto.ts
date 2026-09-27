import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModuleGrantDto, FieldGrantDto } from './create-role.dto';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

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
