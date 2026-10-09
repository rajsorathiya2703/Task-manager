import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireAccess } from '../access/decorators/require-access.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentCompany, TenantScoped } from '../common/tenant.decorators';
import { Types } from 'mongoose';

@Controller('companies/:companySlug/roles')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequireAccess({ module: 'roles', action: 'read' })
  findAll(@CurrentCompany() companyId: Types.ObjectId) {
    return this.rolesService.findAll(companyId);
  }

  @Get(':id')
  @RequireAccess({ module: 'roles', action: 'read' })
  findById(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
  ) {
    return this.rolesService.findById(companyId, id);
  }

  @Post()
  @RequireAccess({ module: 'roles', action: 'create' })
  create(
    @CurrentCompany() companyId: Types.ObjectId,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(companyId, dto);
  }

  @Patch(':id')
  @RequireAccess({ module: 'roles', action: 'update' })
  update(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireAccess({ module: 'roles', action: 'delete' })
  remove(
    @CurrentCompany() companyId: Types.ObjectId,
    @Param('id') id: string,
  ) {
    return this.rolesService.remove(companyId, id);
  }
}
