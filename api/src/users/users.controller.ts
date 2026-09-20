import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Req,
} from '@nestjs/common';
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
  @RequirePermission({ module: 'users', action: 'read' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermission({ module: 'users', action: 'read' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  @Patch(':id')
  @RequirePermission({ module: 'users', action: 'update' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    // Privilege escalation prevention: Only system administrators can modify is_system_admin
    if (updateUserDto.is_system_admin !== undefined) {
      const requester = req.user;
      const requesterId = requester?._id?.toString() || requester?.id?.toString();
      const userPerms = requesterId
        ? await this.userGroupsService.getUserPermissions(requesterId)
        : null;
      const isRequesterAdmin =
        requester?.is_system_admin === true ||
        Boolean(userPerms?.groups?.some((g) => g.trim().toLowerCase() === 'administrators'));

      if (!isRequesterAdmin) {
        throw new ForbiddenException(
          'Access Denied: Only system administrators can modify is_system_admin.',
        );
      }

      // Prevent demoting the last remaining system administrator
      if (updateUserDto.is_system_admin === false) {
        const targetUser = await this.usersService.findById(id);
        if (targetUser?.is_system_admin) {
          const adminCount = await this.usersService.countSystemAdmins();
          if (adminCount <= 1) {
            throw new BadRequestException(
              'Cannot revoke privileges from the last remaining system administrator.',
            );
          }
        }
      }
    }

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
  @RequirePermission({ module: 'users', action: 'delete' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException(`User #${id} not found`);
    }

    // Prevent deleting the last remaining system administrator
    if (targetUser.is_system_admin) {
      const requester = req.user;
      const requesterId = requester?._id?.toString() || requester?.id?.toString();
      const userPerms = requesterId
        ? await this.userGroupsService.getUserPermissions(requesterId)
        : null;
      const isRequesterAdmin =
        requester?.is_system_admin === true ||
        Boolean(userPerms?.groups?.some((g) => g.trim().toLowerCase() === 'administrators'));

      if (!isRequesterAdmin) {
        throw new ForbiddenException(
          'Access Denied: Only system administrators can delete an administrator account.',
        );
      }

      const adminCount = await this.usersService.countSystemAdmins();
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last remaining system administrator.',
        );
      }
    }

    const deleted = await this.usersService.remove(id);
    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return deleted;
  }
}
