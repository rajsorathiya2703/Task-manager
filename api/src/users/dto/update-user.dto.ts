import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  // TODO(MC-34): is_employee and is_system_admin are replaced by Membership.
  // Role/permission changes belong to the PBAC plan.
}
