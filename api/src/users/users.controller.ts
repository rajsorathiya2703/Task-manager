import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { Types } from 'mongoose';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';
import { RequireAccess } from '../access/decorators/require-access.decorator';

@Controller('companies/:companySlug/users')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /companies/:companySlug/users
   * List all members of the current company.
   * Joins Memberships with User (name, email, avatarUrl, lastLoginAt).
   * Never exposes googleId or guestId.
   */
  @Get()
  @RequireAccess({ module: 'users', action: 'read' })
  async findAll(@CurrentCompany() companyId: Types.ObjectId) {
    return this.usersService.listMembers(companyId);
  }

  /**
   * GET /companies/:companySlug/users/:id
   * Returns a single user only if they have a membership in this company, else 404.
   */
  @Get(':id')
  @RequireAccess({ module: 'users', action: 'read' })
  async findOne(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
  ) {
    const member = await this.usersService.getMemberById(companyId, id);
    if (!member) {
      throw new NotFoundException(`User #${id} not found in this company`);
    }
    return member;
  }

  /**
   * PATCH /companies/:companySlug/users/:id
   * Update a member's profile (name only). Role/permission changes belong to PBAC plan.
   * Strips is_employee / is_system_admin fields from the DTO (replaced by Membership in MC-34).
   */
  @Patch(':id')
  @RequireAccess({ module: 'users', action: 'update' })
  async update(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Strip legacy fields that are now handled by Membership
    delete (updateUserDto as any).is_employee;
    delete (updateUserDto as any).is_system_admin;
    delete (updateUserDto as any).email;
    delete (updateUserDto as any).avatarUrl;

    const updated = await this.usersService.updateMemberProfile(
      companyId,
      id,
      { name: updateUserDto.name },
    );
    if (!updated) {
      throw new NotFoundException(`User #${id} not found in this company`);
    }
    return updated;
  }

  /**
   * DELETE /companies/:companySlug/users/:id
   * Suspends the MEMBERSHIP (not the global User).
   * Cannot remove the company owner -> 400.
   */
  @Delete(':id')
  @RequireAccess({ module: 'users', action: 'delete' })
  async remove(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
  ) {
    const result = await this.usersService.suspendMembership(companyId, id);
    if (!result.success && result.message === 'not_found') {
      throw new NotFoundException(`User #${id} not found in this company`);
    }
    return result;
  }
}
