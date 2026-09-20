import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CATALOG_MODULES } from '../../permissions/permissions.catalog';

export class ModulePermissionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([...CATALOG_MODULES], {
    message: `module must be one of: ${CATALOG_MODULES.join(', ')}`,
  })
  module: string;

  @IsOptional()
  @IsString()
  @IsIn(['own', 'team', 'all'], {
    message: 'scope must be one of: own, team, all',
  })
  scope?: 'own' | 'team' | 'all';

  @IsBoolean()
  create: boolean;

  @IsBoolean()
  read: boolean;

  @IsBoolean()
  update: boolean;

  @IsBoolean()
  delete: boolean;
}

