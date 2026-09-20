import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CATALOG_MODULES, CATALOG_OPERATIONS } from '../../permissions/permissions.catalog';

const VALID_OP_KEYS = CATALOG_OPERATIONS.map((o) => o.operation);

export class OperationPermissionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([...CATALOG_MODULES], {
    message: `module must be one of: ${CATALOG_MODULES.join(', ')}`,
  })
  module: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_OP_KEYS, {
    message: `operation must be a valid catalog operation.`,
  })
  operation: string;

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
