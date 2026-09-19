import { Controller, Get, Patch, Delete, Param, Body, UseGuards, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { EmployeesService } from '../employees/employees.service';
import { UserGroupsService } from '../user-groups/user-groups.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userGroupsService: UserGroupsService,
    @Inject(forwardRef(() => EmployeesService))
    private readonly employeesService: EmployeesService,
  ) {}

  @Get()
  @RequirePermission({ module: 'settings', action: 'read' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermission({ module: 'settings', action: 'read' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  @Patch(':id')
  @RequirePermission({ module: 'settings', action: 'update' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const updated = await this.usersService.updateUser(id, updateUserDto);
    if (!updated) {
      throw new NotFoundException(`User #${id} not found`);
    }
    // If is_employee is true on the updated document, ensure a linked Employee exists.
    // createFromUser() is idempotent — calling it multiple times never creates duplicates.
    if (updated.is_employee) {
      await this.employeesService.createFromUser(updated);
    }

    // Synchronize membership with "Administrators" group when is_system_admin is modified
    if (updateUserDto.is_system_admin !== undefined) {
      if (updateUserDto.is_system_admin) {
        await this.userGroupsService.ensureUserInAdminGroup(updated._id);
      } else {
        await this.userGroupsService.removeUserFromAdminGroup(updated._id);
      }
    }

    return updated;
  }

  @Delete(':id')
  @RequirePermission({ module: 'settings', action: 'delete' })
  async remove(@Param('id') id: string) {
    const deleted = await this.usersService.remove(id);
    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return deleted;
  }
}
