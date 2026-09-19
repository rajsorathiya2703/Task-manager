import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  is_employee?: boolean;

  // is_system_admin intentionally removed — can only be set via
  // SYSTEM_ADMIN_EMAILS env var and the bootstrap migration.
  // This prevents privilege escalation through the API.
}
