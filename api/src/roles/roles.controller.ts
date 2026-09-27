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

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequireAccess({ module: 'roles', action: 'read' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequireAccess({ module: 'roles', action: 'read' })
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequireAccess({ module: 'roles', action: 'create' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequireAccess({ module: 'roles', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequireAccess({ module: 'roles', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
