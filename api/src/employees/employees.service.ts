import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from './schemas/employee.schema';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private usersService: UsersService,
  ) {}

  async create(createEmployeeDto: any): Promise<Employee> {
    if (createEmployeeDto.email && typeof createEmployeeDto.email === 'string') {
      createEmployeeDto.email = createEmployeeDto.email.trim().toLowerCase();
      // If user exists with this email, link userId and set is_employee
      const existingUser = await this.usersService.findByEmail(createEmployeeDto.email);
      if (existingUser) {
        createEmployeeDto.userId = existingUser._id;
        await this.usersService.updateUser(existingUser._id.toString(), { is_employee: true });
      }
    }
    const newEmployee = new this.employeeModel(createEmployeeDto);
    return newEmployee.save();
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeModel.find().populate('userId').exec();
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeModel.findById(id).populate('userId').exec();
    if (!employee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }
    return employee;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = email.trim();
    return this.employeeModel.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    }).populate('userId').exec();
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    if (!userId) return null;
    return this.employeeModel.findOne({ userId }).exec();
  }

  async linkUserByEmail(email: string, userId: any): Promise<Employee | null> {
    if (!email || !email.trim()) return null;
    const cleanEmail = email.trim();
    const updated = await this.employeeModel.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } },
      { $set: { userId } },
      { new: true },
    ).exec();

    if (updated && userId) {
      await this.usersService.updateUser(userId.toString(), { is_employee: true });
    }
    return updated;
  }

  async update(id: string, updateEmployeeDto: any): Promise<Employee> {
    if (updateEmployeeDto.email !== undefined) {
      if (updateEmployeeDto.email && typeof updateEmployeeDto.email === 'string') {
        updateEmployeeDto.email = updateEmployeeDto.email.trim().toLowerCase();
        const matchingUser = await this.usersService.findByEmail(updateEmployeeDto.email);
        updateEmployeeDto.userId = matchingUser ? matchingUser._id : null;
        if (matchingUser) {
          await this.usersService.updateUser(matchingUser._id.toString(), { is_employee: true });
        }
      } else {
        updateEmployeeDto.userId = null;
      }
    }

    const existingEmployee = await this.employeeModel.findByIdAndUpdate(
      id,
      { $set: updateEmployeeDto },
      { new: true },
    ).populate('userId').exec();

    if (!existingEmployee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }
    return existingEmployee;
  }

  async remove(id: string): Promise<any> {
    const deletedEmployee = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!deletedEmployee) {
      throw new NotFoundException(`Employee #${id} not found`);
    }
    if (deletedEmployee.userId) {
      const remaining = await this.employeeModel.findOne({ userId: deletedEmployee.userId }).exec();
      if (!remaining) {
        await this.usersService.updateUser(deletedEmployee.userId.toString(), { is_employee: false });
      }
    }
    return deletedEmployee;
  }

  /**
   * Idempotently create (or link) an Employee record for a given User.
   *
   * Priority order:
   *  1. If an Employee already has userId === user._id → return it (no duplicate created).
   *  2. If user.email exists and an *unlinked* Employee has that email → link it via
   *     linkUserByEmail() and return the updated record.
   *  3. Otherwise → create a brand-new Employee with sensible defaults.
   *
   * Omits the `email` key entirely for guest users (no email) to avoid writing
   * null/'' into the sparse-unique index (sparse skips *absent* keys, not empty strings).
   */
  async createFromUser(user: UserDocument): Promise<Employee> {
    // 1. Idempotency guard — already linked?
    const existing = await this.employeeModel.findOne({ userId: user._id }).exec();
    if (existing) return existing;

    // 2. Unlinked Employee with matching email → link instead of creating a duplicate
    if (user.email) {
      const linked = await this.linkUserByEmail(user.email, user._id);
      if (linked) return linked;
    }

    // 3. Create a new Employee record
    const nameParts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || user.email || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload: Record<string, any> = {
      userId: user._id,
      fullName: { firstName, lastName },
      role: 'Employee',
      joiningDate: new Date(),
      status: 'Active',
    };

    // Only set email if present — omitting the key entirely satisfies the sparse unique index
    if (user.email) {
      payload.email = user.email;
    }

    const newEmployee = new this.employeeModel(payload);
    return newEmployee.save();
  }

  /**
   * Verified, explicit link repair.
   *
   * Links Employee._id → userId ONLY when:
   *  - The Employee has no userId yet (is unlinked), OR already points to this userId.
   *  - The Employee's email matches `verifiedEmail` (the User's own email), so a
   *    user can never claim an Employee record that belongs to a different person.
   *
   * Returns the (possibly updated) Employee on success, null if no match / already
   * linked to a different user / email mismatch.
   */
  async linkByUserId(
    userId: any,
    verifiedEmail: string,
  ): Promise<Employee | null> {
    if (!verifiedEmail || !verifiedEmail.trim()) return null;
    const cleanEmail = verifiedEmail.trim().toLowerCase();

    // Find an employee whose email matches the verified email
    const employee = await this.employeeModel
      .findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } })
      .exec();

    if (!employee) return null;

    // Already linked to this user — idempotent, return as-is
    if (employee.userId?.toString() === userId?.toString()) return employee;

    // Already linked to a DIFFERENT user — do not overwrite
    if (employee.userId) return null;

    // Safe to link
    return this.employeeModel
      .findByIdAndUpdate(
        employee._id,
        { $set: { userId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Returns the link status for a given Employee:
   *  - linked: whether userId is set
   *  - userId: the linked User._id (or null)
   *  - employeeEmail: the Employee's email (or null)
   */
  async getLinkStatus(id: string): Promise<{
    linked: boolean;
    userId: string | null;
    employeeEmail: string | null;
  }> {
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) return { linked: false, userId: null, employeeEmail: null };
    return {
      linked: !!employee.userId,
      userId: employee.userId ? employee.userId.toString() : null,
      employeeEmail: employee.email || null,
    };
  }
}

