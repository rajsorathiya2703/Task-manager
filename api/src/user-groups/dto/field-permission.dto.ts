import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CATALOG_MODELS_AND_FIELDS } from '../../permissions/permissions.catalog';

const VALID_MODELS = Object.keys(CATALOG_MODELS_AND_FIELDS);

export class FieldPermissionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_MODELS, {
    message: `model must be one of: ${VALID_MODELS.join(', ')}`,
  })
  model: string;

  @IsString()
  @IsNotEmpty()
  field: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  write?: boolean;

  @IsOptional()
  @IsBoolean()
  update?: boolean;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;
}
