import { Controller, Get, Patch, Delete, Param, Body, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { EmployeesService } from '../employees/employees.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
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
    return updated;
  }

  @Delete(':id')
  @RequirePermission({ module: 'users', action: 'delete' })
  async remove(@Param('id') id: string) {
    const deleted = await this.usersService.remove(id);
    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return deleted;
  }
}
