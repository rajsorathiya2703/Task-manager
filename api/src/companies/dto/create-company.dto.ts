import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  industry?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  sizeRange?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  country?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  timezone?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  currency?: string;

  @ValidateIf((_, v) => Array.isArray(v) && v.length > 0)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workWeek?: string[];

  @ValidateIf((_, v) => v != null && v !== '')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  fiscalYearStart?: number;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  contactEmail?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  phone?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  address?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl({ require_tld: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  website?: string;

  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  logoUrl?: string;
}
