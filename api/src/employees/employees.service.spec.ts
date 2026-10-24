import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { EmployeesService } from './employees.service';
import { Employee } from './schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';
import { UsersService } from '../users/users.service';
import { Membership } from '../companies/schemas/membership.schema';
import { Role } from '../access/schemas/role.schema';
import { User } from '../users/schemas/user.schema';

describe('EmployeesService - PBAC Scope Filtering (P1-15)', () => {
  let service: EmployeesService;
  let employeeModel: any;
  let teamModel: any;
  let usersService: any;

  let findOneMock: jest.Mock;
  let findOneAndUpdateMock: jest.Mock;
  let findOneAndDeleteMock: jest.Mock;

  // Personas
  const mockCompanyId = new Types.ObjectId();

  const aliceUserId = new Types.ObjectId().toString();
  const aliceEmpId = new Types.ObjectId();
  const aliceEmail = 'alice@example.com';

  const bobUserId = new Types.ObjectId().toString();
  const bobEmpId = new Types.ObjectId();
  const bobEmail = 'bob@example.com';

  const charlieUserId = new Types.ObjectId().toString();
  const charlieEmpId = new Types.ObjectId();
  const charlieEmail = 'charlie@example.com';

  const adminUserId = new Types.ObjectId().toString();
  const adminEmail = 'admin@example.com';

  const teamAlphaId = new Types.ObjectId();
  const teamBetaId = new Types.ObjectId();

  const aliceEmployeeDoc = {
    _id: aliceEmpId,
    id: aliceEmpId.toString(),
    companyId: mockCompanyId,
    userId: aliceUserId,
    email: aliceEmail,
    fullName: { firstName: 'Alice', lastName: 'Smith' },
    role: 'Developer',
    status: 'Active',
  };

  const bobEmployeeDoc = {
    _id: bobEmpId,
    id: bobEmpId.toString(),
    companyId: mockCompanyId,
    userId: bobUserId,
    email: bobEmail,
    fullName: { firstName: 'Bob', lastName: 'Jones' },
    role: 'Developer',
    status: 'Active',
  };

  const charlieEmployeeDoc = {
    _id: charlieEmpId,
    id: charlieEmpId.toString(),
    companyId: mockCompanyId,
    userId: charlieUserId,
    email: charlieEmail,
    fullName: { firstName: 'Charlie', lastName: 'Brown' },
    role: 'Designer',
    status: 'Active',
  };

  beforeEach(async () => {
    const mockFindChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    findOneMock = jest.fn();
    findOneAndUpdateMock = jest.fn();
    findOneAndDeleteMock = jest.fn();

    function MockEmployeeModel(this: any, dto: any) {
      Object.assign(this, dto);
    }
    MockEmployeeModel.prototype.save = jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    });
    Object.assign(MockEmployeeModel, {
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([aliceEmployeeDoc, bobEmployeeDoc, charlieEmployeeDoc]),
        }),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
        exec: jest.fn().mockResolvedValue([aliceEmployeeDoc, bobEmployeeDoc, charlieEmployeeDoc]),
      }),
      findById: findOneMock,
      findOne: findOneMock,
      findByIdAndUpdate: findOneAndUpdateMock,
      findOneAndUpdate: findOneAndUpdateMock,
      findByIdAndDelete: findOneAndDeleteMock,
      findOneAndDelete: findOneAndDeleteMock,
    });
    employeeModel = MockEmployeeModel;

    teamModel = {
      find: jest.fn().mockReturnValue(mockFindChain),
      findById: jest.fn(),
    };

    usersService = {
      findByEmail: jest.fn(),
      updateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getModelToken(Employee.name), useValue: employeeModel },
        { provide: getModelToken(Team.name), useValue: teamModel },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  describe('findAll', () => {
    it('returns empty array immediately when scope is none', async () => {
      const result = await service.findAll(mockCompanyId, aliceUserId, aliceEmail, false, 'none');
      expect(result).toEqual([]);
      expect(employeeModel.find).not.toHaveBeenCalled();
    });

    it('returns all employees unconstrained when scope is all', async () => {
      const allEmployees = [aliceEmployeeDoc, bobEmployeeDoc, charlieEmployeeDoc];
      employeeModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(allEmployees),
        }),
      });

      const result = await service.findAll(mockCompanyId, aliceUserId, aliceEmail, false, 'all');
      expect(result).toEqual(allEmployees);
      expect(employeeModel.find).toHaveBeenCalledWith({ companyId: mockCompanyId });
    });

    it('returns all employees unconstrained when caller is System Admin', async () => {
      const allEmployees = [aliceEmployeeDoc, bobEmployeeDoc, charlieEmployeeDoc];
      employeeModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(allEmployees),
        }),
      });

      const result = await service.findAll(mockCompanyId, adminUserId, adminEmail, true, 'own');
      expect(result).toEqual(allEmployees);
      expect(employeeModel.find).toHaveBeenCalledWith({ companyId: mockCompanyId });
    });

    it('filters query strictly to caller own employee record under scope own', async () => {
      // 1. Caller employee lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // 2. Query execution with scope filter
      employeeModel.find.mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([aliceEmployeeDoc]),
        }),
      });

      const result = await service.findAll(mockCompanyId, aliceUserId, aliceEmail, false, 'own');
      expect(result).toEqual([aliceEmployeeDoc]);

      // Verify filter passed to employeeModel.find contains companyId and Alice's identifiers
      expect(employeeModel.find).toHaveBeenLastCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          $or: expect.arrayContaining([
            { _id: { $in: [aliceEmpId] } },
          ]),
        }),
      );
    });

    it('includes teammates sharing at least one team under scope team', async () => {
      // 1. Caller employee lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // 2. Teams where Alice is member/lead (Team Alpha has Alice and Bob)
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { _id: teamAlphaId, teamLead: aliceEmpId, members: [aliceEmpId, bobEmpId] },
            ]),
          }),
        }),
      });

      // 3. Final employee query
      employeeModel.find.mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([aliceEmployeeDoc, bobEmployeeDoc]),
        }),
      });

      const result = await service.findAll(mockCompanyId, aliceUserId, aliceEmail, false, 'team');
      expect(result).toEqual([aliceEmployeeDoc, bobEmployeeDoc]);

      // Verify filter includes companyId and colleague IDs
      expect(employeeModel.find).toHaveBeenLastCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          $or: expect.arrayContaining([
            { _id: { $in: expect.arrayContaining([aliceEmpId, bobEmpId]) } },
          ]),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if id is invalid', async () => {
      await expect(service.findOne(mockCompanyId, 'invalid-mongo-id', aliceUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if employee does not exist', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne(mockCompanyId, nonExistentId, aliceUserId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when scope is none', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(aliceEmployeeDoc),
        }),
      });

      await expect(
        service.findOne(mockCompanyId, aliceEmpId.toString(), aliceUserId, aliceEmail, false, 'none'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ALLOWS caller to read own employee record under scope own', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(aliceEmployeeDoc),
        }),
      });

      // Caller employee lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      const result = await service.findOne(
        mockCompanyId,
        aliceEmpId.toString(),
        aliceUserId,
        aliceEmail,
        false,
        'own',
      );
      expect(result).toBe(aliceEmployeeDoc);
    });

    it('THROWS ForbiddenException when caller reads ANOTHER employee record under scope own', async () => {
      // Bob is the target employee
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(bobEmployeeDoc),
        }),
      });

      // Alice is the caller
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // Team queries for Alice and Bob
      teamModel.find
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      await expect(
        service.findOne(mockCompanyId, bobEmpId.toString(), aliceUserId, aliceEmail, false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ALLOWS caller to read a teammate employee record under scope team', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(bobEmployeeDoc),
        }),
      });

      // Alice lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // Caller teams: Alice is in Team Alpha
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { _id: teamAlphaId, members: [aliceEmpId, bobEmpId], teamLead: aliceEmpId },
            ]),
          }),
        }),
      });

      // Target teams: Bob is in Team Alpha
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: teamAlphaId }]),
          }),
        }),
      });

      const result = await service.findOne(
        mockCompanyId,
        bobEmpId.toString(),
        aliceUserId,
        aliceEmail,
        false,
        'team',
      );
      expect(result).toBe(bobEmployeeDoc);
    });

    it('THROWS ForbiddenException when caller reads an employee from a DIFFERENT team under scope team', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(charlieEmployeeDoc),
        }),
      });

      // Alice lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      // Alice is in Team Alpha
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { _id: teamAlphaId, members: [aliceEmpId, bobEmpId], teamLead: aliceEmpId },
            ]),
          }),
        }),
      });

      // Charlie is in Team Beta
      teamModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: teamBetaId }]),
          }),
        }),
      });

      await expect(
        service.findOne(mockCompanyId, charlieEmpId.toString(), aliceUserId, aliceEmail, false, 'team'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ALLOWS reading any employee under scope all', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(charlieEmployeeDoc),
        }),
      });

      const result = await service.findOne(
        mockCompanyId,
        charlieEmpId.toString(),
        aliceUserId,
        aliceEmail,
        false,
        'all',
      );
      expect(result).toBe(charlieEmployeeDoc);
    });

    it('ALLOWS System Admin to read any employee regardless of scope', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(charlieEmployeeDoc),
        }),
      });

      const result = await service.findOne(
        mockCompanyId,
        charlieEmpId.toString(),
        adminUserId,
        adminEmail,
        true,
        'none',
      );
      expect(result).toBe(charlieEmployeeDoc);
    });
  });

  describe('update', () => {
    it('ALLOWS caller to update their own employee record under scope own', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(aliceEmployeeDoc),
        }),
      });

      // Caller lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      const updatedDoc = { ...aliceEmployeeDoc, department: 'Engineering' };
      findOneAndUpdateMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedDoc),
        }),
      });

      const result = await service.update(
        mockCompanyId,
        aliceEmpId.toString(),
        { department: 'Engineering' },
        aliceUserId,
        aliceEmail,
        false,
        'own',
      );
      expect(result).toBe(updatedDoc);
    });

    it('THROWS ForbiddenException when caller updates another employee under scope own', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(bobEmployeeDoc),
        }),
      });

      // Alice lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      teamModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.update(
          mockCompanyId,
          bobEmpId.toString(),
          { department: 'Design' },
          aliceUserId,
          aliceEmail,
          false,
          'own',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('THROWS ForbiddenException when caller deletes another employee under scope own', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(charlieEmployeeDoc),
        }),
      });

      // Alice lookup
      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      teamModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.remove(mockCompanyId, charlieEmpId.toString(), aliceUserId, aliceEmail, false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ALLOWS System Admin to remove an employee', async () => {
      findOneMock.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(charlieEmployeeDoc),
        }),
      });

      findOneAndDeleteMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(charlieEmployeeDoc),
      });

      const result = await service.remove(
        mockCompanyId,
        charlieEmpId.toString(),
        adminUserId,
        adminEmail,
        true,
        'all',
      );
      expect(result).toBe(charlieEmployeeDoc);
      expect(findOneAndDeleteMock).toHaveBeenCalledWith({
        _id: new Types.ObjectId(charlieEmpId),
        companyId: mockCompanyId,
      });
    });
  });

  describe('getLinkStatus', () => {
    it('ALLOWS caller to get own link status under scope own', async () => {
      findOneMock
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(aliceEmployeeDoc),
          }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(aliceEmployeeDoc),
        });

      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      const result = await service.getLinkStatus(
        mockCompanyId,
        aliceEmpId.toString(),
        aliceUserId,
        aliceEmail,
        false,
        'own',
      );
      expect(result.linked).toBe(true);
      expect(result.userId).toBe(aliceUserId);
      expect(result.employeeEmail).toBe(aliceEmail);
    });

    it('THROWS ForbiddenException when caller gets link status of another employee under scope own', async () => {
      findOneMock.mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(bobEmployeeDoc),
        }),
      });

      employeeModel.find.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: aliceEmpId }]),
          }),
        }),
      });

      teamModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.getLinkStatus(mockCompanyId, bobEmpId.toString(), aliceUserId, aliceEmail, false, 'own'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cross-tenant isolation (MC-14)', () => {
    it('returns NotFoundException when querying an employee from company A with company B context', async () => {
      const employeeInA = {
        _id: aliceEmpId,
        companyId: mockCompanyId,
        name: 'Alice',
      };

      findOneMock.mockImplementation((filter: any) => {
        if (
          filter.companyId?.toString() === mockCompanyId.toString() &&
          filter._id?.toString() === aliceEmpId.toString()
        ) {
          return {
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(employeeInA),
            }),
            exec: jest.fn().mockResolvedValue(employeeInA),
          };
        }
        return {
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
          exec: jest.fn().mockResolvedValue(null),
        };
      });

      // Querying with company A succeeds
      const foundInA = await service.findOne(
        mockCompanyId,
        aliceEmpId.toString(),
        adminUserId,
        adminEmail,
        true,
        'all',
      );
      expect(foundInA).toEqual(employeeInA);

      // Querying with company B throws NotFoundException (404)
      const companyBId = new Types.ObjectId();
      await expect(
        service.findOne(
          companyBId,
          aliceEmpId.toString(),
          adminUserId,
          adminEmail,
          true,
          'all',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces email uniqueness per company on create', async () => {
      const companyAId = new Types.ObjectId();
      const newEmpDto = {
        email: 'duplicate@example.com',
        fullName: { firstName: 'Test', lastName: 'User' },
        role: 'Employee',
        joiningDate: new Date(),
      };

      // Mock finding an existing employee with this email in company A
      findOneMock.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
          }),
        }),
      });

      await expect(service.create(companyAId, newEmpDto)).rejects.toThrow(ConflictException);
    });

    it('linkUserByEmail scopes strictly to the given companyId and does not touch an employee in another company', async () => {
      const companyAId = new Types.ObjectId();
      const companyBId = new Types.ObjectId();
      const userAId = new Types.ObjectId();
      const sharedEmail = 'user@example.com';

      findOneAndUpdateMock.mockImplementation((filter: any, update: any) => {
        if (filter.companyId?.toString() === companyAId.toString()) {
          return {
            exec: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId(),
              companyId: companyAId,
              email: sharedEmail,
              userId: update.$set.userId,
            }),
          };
        }
        return {
          exec: jest.fn().mockResolvedValue(null),
        };
      });

      const linked = await service.linkUserByEmail(companyAId, sharedEmail, userAId);
      expect(linked).toBeDefined();
      expect(linked?.companyId).toEqual(companyAId);
      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: companyAId }),
        expect.anything(),
        expect.anything(),
      );

      const notFoundInB = await service.linkUserByEmail(companyBId, sharedEmail, userAId);
      expect(notFoundInB).toBeNull();
    });

    it('createFromUser creates owner employee with role Owner and status Active in target company', async () => {
      const companyAId = new Types.ObjectId();
      const userDoc: any = {
        _id: new Types.ObjectId(),
        email: 'owner@example.com',
        name: 'Owner Person',
      };

      findOneMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      findOneAndUpdateMock.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const created = await service.createFromUser(companyAId, userDoc, 'Owner', 'Active');
      expect(created).toBeDefined();
      expect(created.role).toBe('Owner');
      expect(created.status).toBe('Active');
      expect(created.companyId).toEqual(companyAId);
      expect(created.userId).toEqual(userDoc._id);
    });

    it('allows same email to be created in two different companies (BUG-09)', async () => {
      const companyAId = new Types.ObjectId();
      const companyBId = new Types.ObjectId();
      const sharedEmail = 'multicompany.user@example.com';

      findOneMock.mockImplementation(() => ({
        select: () => ({
          lean: () => ({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      }));

      const empA = await service.create(companyAId, {
        email: sharedEmail,
        fullName: { firstName: 'Multi', lastName: 'User' },
        role: 'Employee',
        joiningDate: new Date(),
      });
      expect(empA).toBeDefined();
      expect(empA.companyId).toEqual(companyAId);
      expect(empA.email).toBe(sharedEmail);

      const empB = await service.create(companyBId, {
        email: sharedEmail,
        fullName: { firstName: 'Multi', lastName: 'User' },
        role: 'Employee',
        joiningDate: new Date(),
      });
      expect(empB).toBeDefined();
      expect(empB.companyId).toEqual(companyBId);
      expect(empB.email).toBe(sharedEmail);
    });

    it('catches Mongo E11000 duplicate key error and throws ConflictException (BUG-09)', async () => {
      const companyAId = new Types.ObjectId();
      const empDto = {
        email: 'collision@example.com',
        fullName: { firstName: 'Collide', lastName: 'User' },
        role: 'Employee',
        joiningDate: new Date(),
      };

      findOneMock.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      jest.spyOn(employeeModel.prototype, 'save').mockRejectedValueOnce({
        code: 11000,
        message: 'E11000 duplicate key error',
      });

      await expect(service.create(companyAId, empDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('activateForUser (BUG-02)', () => {
    let empModel: any;
    let membModel: any;
    let rModel: any;
    let uModel: any;
    let uService: any;
    let actService: EmployeesService;

    const company1Id = new Types.ObjectId();
    const company2Id = new Types.ObjectId();
    const defaultRoleId = new Types.ObjectId();

    beforeEach(async () => {
      const employeesDb: any[] = [];
      const membershipsDb: any[] = [];
      const rolesDb: any[] = [
        {
          _id: defaultRoleId,
          slug: 'employee',
          name: 'Employee',
          isActive: true,
          members: [],
        },
      ];

      function MockEmp(this: any, data: any) {
        Object.assign(this, data);
        if (!this._id) this._id = new Types.ObjectId();
        this.save = jest.fn().mockImplementation(async () => {
          const idx = employeesDb.findIndex((e) => String(e._id) === String(this._id));
          if (idx >= 0) employeesDb[idx] = this;
          else employeesDb.push(this);
          return this;
        });
      }

      empModel = MockEmp;
      empModel.find = jest.fn().mockImplementation((query: any) => {
        let results = [...employeesDb];
        if (query?.email) {
          const regex = query.email instanceof RegExp ? query.email : new RegExp(query.email, 'i');
          results = results.filter((e) => regex.test(e.email));
        }
        return {
          exec: jest.fn().mockResolvedValue(results),
        };
      });
      empModel.findOne = jest.fn().mockImplementation((query: any) => ({
        select: () => ({
          lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
        }),
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
        exec: jest.fn().mockResolvedValue(
          employeesDb.find((e) => {
            if (query.companyId && String(e.companyId) !== String(query.companyId)) return false;
            if (query.email && !new RegExp(query.email.$regex || query.email, 'i').test(e.email)) return false;
            return true;
          }) || null,
        ),
      }));
      empModel.updateOne = jest.fn().mockImplementation(async (query: any, update: any) => {
        const item = employeesDb.find((e) => String(e._id) === String(query._id));
        if (item && update.$set) {
          Object.assign(item, update.$set);
        }
        return { modifiedCount: 1 };
      });

      membModel = {
        findOne: jest.fn().mockImplementation((query: any) => ({
          exec: jest.fn().mockResolvedValue(
            membershipsDb.find((m) =>
              String(m.companyId) === String(query.companyId) &&
              String(m.userId) === String(query.userId)
            ) || null,
          ),
        })),
        create: jest.fn().mockImplementation(async (doc: any) => {
          const created = { _id: new Types.ObjectId(), ...doc, save: jest.fn() };
          membershipsDb.push(created);
          return created;
        }),
        updateOne: jest.fn().mockImplementation(async (query: any, update: any) => {
          let item = membershipsDb.find((m) =>
            String(m.companyId) === String(query.companyId) &&
            String(m.userId) === String(query.userId)
          );
          if (!item && query._id) {
            item = membershipsDb.find((m) => String(m._id) === String(query._id));
          }
          if (item) {
            if (update.$set) Object.assign(item, update.$set);
            if (update.$addToSet?.roleIds) {
              item.roleIds = item.roleIds || [];
              if (!item.roleIds.some((r: any) => String(r) === String(update.$addToSet.roleIds))) {
                item.roleIds.push(update.$addToSet.roleIds);
              }
            }
          }
          return { modifiedCount: 1 };
        }),
      };

      rModel = {
        findOne: jest.fn().mockImplementation((query: any) => {
          const chain: any = {
            sort: () => chain,
            select: () => chain,
            lean: () => chain,
            exec: jest.fn().mockResolvedValue(
              rolesDb.find((r) => {
                if (query.slug && r.slug !== query.slug) return false;
                if (query._id?.$in && !query._id.$in.some((id: any) => String(id) === String(r._id))) return false;
                if (query.isActive !== undefined && r.isActive !== query.isActive) return false;
                return true;
              }) || null,
            ),
          };
          return chain;
        }),
        updateOne: jest.fn().mockImplementation(async (query: any, update: any) => {
          const role = rolesDb.find((r) => String(r._id) === String(query._id));
          if (role && update.$addToSet?.members) {
            role.members = role.members || [];
            if (!role.members.some((m: any) => String(m) === String(update.$addToSet.members))) {
              role.members.push(update.$addToSet.members);
            }
          }
          return { modifiedCount: 1 };
        }),
      };

      uModel = {
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      uService = {
        findByEmail: jest.fn(),
        updateUser: jest.fn().mockResolvedValue({}),
      };

      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          EmployeesService,
          { provide: getModelToken(Employee.name), useValue: empModel },
          { provide: getModelToken(Team.name), useValue: { find: jest.fn() } },
          { provide: UsersService, useValue: uService },
          { provide: getModelToken(Membership.name), useValue: membModel },
          { provide: getModelToken(Role.name), useValue: rModel },
          { provide: getModelToken(User.name), useValue: uModel },
        ],
      }).compile();

      actService = mod.get<EmployeesService>(EmployeesService);

      // Helper to seed unlinked employee
      (actService as any)._seedEmployee = (data: any) => {
        const emp = new MockEmp(data);
        employeesDb.push(emp);
        return emp;
      };
      (actService as any)._seedMembership = (data: any) => {
        const mem = { _id: new Types.ObjectId(), save: jest.fn(), ...data };
        membershipsDb.push(mem);
        return mem;
      };
      (actService as any)._getMemberships = () => membershipsDb;
      (actService as any)._getRoles = () => rolesDb;
      (actService as any)._getEmployees = () => employeesDb;
    });

    it('(a) employee created first then login: links employee, creates membership with default role, sets is_employee', async () => {
      const user = { _id: new Types.ObjectId(), email: 'precreated@example.com' };
      const preEmployee = (actService as any)._seedEmployee({
        _id: new Types.ObjectId(),
        companyId: company1Id,
        email: 'precreated@example.com',
        userId: null,
        role: 'Employee',
      });

      const count = await actService.activateForUser(user);
      expect(count).toBe(1);

      // Verify employee userId is linked
      expect(String(preEmployee.userId)).toBe(String(user._id));

      // Verify membership created with default role
      const memberships = (actService as any)._getMemberships();
      expect(memberships).toHaveLength(1);
      expect(String(memberships[0].companyId)).toBe(String(company1Id));
      expect(String(memberships[0].userId)).toBe(String(user._id));
      expect(memberships[0].status).toBe('active');
      expect(memberships[0].roleIds.map(String)).toContain(String(defaultRoleId));

      // Verify role members updated
      const roles = (actService as any)._getRoles();
      expect(roles[0].members.map(String)).toContain(String(user._id));

      // Verify user is_employee flag updated
      expect(uModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        { $set: { is_employee: true } },
      );
    });

    it('(b) login first then employee created: creates employee and immediately activates membership', async () => {
      const existingUser = { _id: new Types.ObjectId(), email: 'existinguser@example.com' };
      uService.findByEmail.mockResolvedValue(existingUser);

      const created = await actService.create(company1Id, {
        email: 'existinguser@example.com',
        fullName: { firstName: 'Existing', lastName: 'User' },
        role: 'Employee',
        joiningDate: new Date(),
      });

      expect(created).toBeDefined();
      expect(String(created.userId)).toBe(String(existingUser._id));

      // Membership should be created for this user in company1Id
      const memberships = (actService as any)._getMemberships();
      expect(memberships).toHaveLength(1);
      expect(String(memberships[0].companyId)).toBe(String(company1Id));
      expect(String(memberships[0].userId)).toBe(String(existingUser._id));
      expect(memberships[0].roleIds.map(String)).toContain(String(defaultRoleId));
    });

    it('(c) two companies same email: links both employee records and ensures memberships in both companies', async () => {
      const sharedEmail = 'multicompany@example.com';
      const user = { _id: new Types.ObjectId(), email: sharedEmail };

      const emp1 = (actService as any)._seedEmployee({
        _id: new Types.ObjectId(),
        companyId: company1Id,
        email: sharedEmail,
        userId: null,
      });
      const emp2 = (actService as any)._seedEmployee({
        _id: new Types.ObjectId(),
        companyId: company2Id,
        email: sharedEmail,
        userId: null,
      });

      const count = await actService.activateForUser(user);
      expect(count).toBe(2);

      expect(String(emp1.userId)).toBe(String(user._id));
      expect(String(emp2.userId)).toBe(String(user._id));

      const memberships = (actService as any)._getMemberships();
      expect(memberships).toHaveLength(2);
      const companyIds = memberships.map((m: any) => String(m.companyId));
      expect(companyIds).toContain(String(company1Id));
      expect(companyIds).toContain(String(company2Id));
    });

    it('(d) second call is a no-op: does not duplicate memberships or overwrite data', async () => {
      const user = { _id: new Types.ObjectId(), email: 'idempotent@example.com' };
      (actService as any)._seedEmployee({
        _id: new Types.ObjectId(),
        companyId: company1Id,
        email: 'idempotent@example.com',
        userId: null,
      });

      const firstCount = await actService.activateForUser(user);
      expect(firstCount).toBe(1);

      const membershipsAfterFirst = [...(actService as any)._getMemberships()];
      expect(membershipsAfterFirst).toHaveLength(1);

      // Second call
      const secondCount = await actService.activateForUser(user);
      expect(secondCount).toBe(1);

      const membershipsAfterSecond = (actService as any)._getMemberships();
      expect(membershipsAfterSecond).toHaveLength(1);
      expect(membershipsAfterSecond[0].roleIds).toHaveLength(1);
    });

    it('(e) preserves existing assigned roles and does not restore Employee role if user was updated in Configuration -> Roles', async () => {
      const customRoleId = new Types.ObjectId();
      const user = { _id: new Types.ObjectId(), email: 'customrole@example.com' };

      // Pre-seed an employee record
      (actService as any)._seedEmployee({
        _id: new Types.ObjectId(),
        companyId: company1Id,
        email: 'customrole@example.com',
        userId: user._id,
        role: 'Manager',
      });

      // Pre-seed membership with Manager role (assigned via Configuration -> Roles)
      (actService as any)._seedMembership({
        companyId: company1Id,
        userId: user._id,
        roleIds: [customRoleId],
        status: 'active',
      });

      // User logs in and activateForUser runs
      await actService.activateForUser(user);

      // Verify membership roleIds still only contains customRoleId (NOT defaultRoleId Employee)
      const memberships = (actService as any)._getMemberships();
      const userMem = memberships.find((m: any) => String(m.userId) === String(user._id));
      expect(userMem).toBeDefined();
      expect(userMem.roleIds.map(String)).toEqual([String(customRoleId)]);
      expect(userMem.roleIds.map(String)).not.toContain(String(defaultRoleId));

      // Verify role.members of default role does NOT contain user
      const roles = (actService as any)._getRoles();
      const empRole = roles.find((r: any) => String(r._id) === String(defaultRoleId));
      expect(empRole.members.map(String)).not.toContain(String(user._id));
    });
  });

  describe('BUG-01: Employee Invitation Flow', () => {
    let mockEmailService: any;
    let mockCompanyModel: any;
    let serviceWithEmail: EmployeesService;
    let testEmpModel: any;
    let testUsersService: any;

    beforeEach(() => {
      mockEmailService = {
        sendEmployeeInvite: jest.fn().mockResolvedValue(true),
      };

      mockCompanyModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ _id: mockCompanyId, name: 'Acme Test Corp' }),
            }),
          }),
        }),
      };

      testUsersService = {
        findByEmail: jest.fn().mockResolvedValue(null),
      };

      function TestEmp(this: any, dto: any) {
        Object.assign(this, dto);
      }
      TestEmp.prototype.save = jest.fn().mockImplementation(function (this: any) {
        this._id = this._id || new Types.ObjectId();
        return Promise.resolve(this);
      });
      TestEmp.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      testEmpModel = TestEmp;

      serviceWithEmail = new EmployeesService(
        testEmpModel,
        {} as any,
        testUsersService,
        undefined, // membershipModel
        undefined, // companyMemberModel
        undefined, // roleModel
        undefined, // userModel
        mockEmailService, // emailService
        mockCompanyModel, // companyModel
      );
    });

    it('invokes emailService.sendEmployeeInvite after saving a new employee', async () => {
      const dto = {
        email: 'invited@example.com',
        fullName: { firstName: 'John', lastName: 'Doe' },
        role: 'Engineer',
        joiningDate: new Date(),
      };

      const result = await serviceWithEmail.create(mockCompanyId, dto, 'Admin Lead');
      expect(result).toBeDefined();
      expect(mockEmailService.sendEmployeeInvite).toHaveBeenCalledTimes(1);
      const inviteCall = mockEmailService.sendEmployeeInvite.mock.calls[0][0];
      expect(inviteCall.to).toBe('invited@example.com');
      expect(inviteCall.companyName).toBe('Acme Test Corp');
      expect(inviteCall.inviterName).toBe('Admin Lead');
      expect(inviteCall.employeeName).toBe('John Doe');
    });

    it('creates employee successfully even when emailService.sendEmployeeInvite throws/rejects', async () => {
      mockEmailService.sendEmployeeInvite.mockRejectedValue(new Error('SMTP Network Failure'));

      const dto = {
        email: 'robust@example.com',
        fullName: { firstName: 'Robust', lastName: 'Worker' },
        role: 'Engineer',
        joiningDate: new Date(),
      };

      const result = await serviceWithEmail.create(mockCompanyId, dto, 'Admin Lead');
      expect(result).toBeDefined();
      expect(result.email).toBe('robust@example.com');
      expect(mockEmailService.sendEmployeeInvite).toHaveBeenCalledTimes(1);
    });

    it('calls activateForUser when user with email already exists', async () => {
      const existingUser = {
        _id: new Types.ObjectId(),
        email: 'preexisting@example.com',
      };
      testUsersService.findByEmail.mockResolvedValue(existingUser);
      const activateSpy = jest.spyOn(serviceWithEmail, 'activateForUser').mockResolvedValue(1);

      const dto = {
        email: 'preexisting@example.com',
        fullName: { firstName: 'Pre', lastName: 'Existing' },
        role: 'Designer',
        joiningDate: new Date(),
      };

      const result = await serviceWithEmail.create(mockCompanyId, dto, 'Admin Lead');
      expect(result).toBeDefined();
      expect(activateSpy).toHaveBeenCalledWith(existingUser);
      expect(mockEmailService.sendEmployeeInvite).toHaveBeenCalledTimes(1);
    });

    describe('resendInvite', () => {
      it('throws NotFoundException when employee is not found', async () => {
        testEmpModel.findOne = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        let error: any;
        try {
          await serviceWithEmail.resendInvite(mockCompanyId, new Types.ObjectId().toString(), 'Admin');
        } catch (err) {
          error = err;
        }
        expect(error).toBeInstanceOf(NotFoundException);
      });

      it('throws BadRequestException when employee has no email', async () => {
        const empWithoutEmail = {
          _id: new Types.ObjectId(),
          companyId: mockCompanyId,
          email: '',
          fullName: { firstName: 'No', lastName: 'Mail' },
        };
        testEmpModel.findOne = jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(empWithoutEmail),
        });

        let error: any;
        try {
          await serviceWithEmail.resendInvite(mockCompanyId, empWithoutEmail._id.toString(), 'Admin');
        } catch (err) {
          error = err;
        }
        expect(error).toBeInstanceOf(BadRequestException);
      });

      it('resends invite successfully and calls activateForUser if user exists', async () => {
        const empId = new Types.ObjectId();
        const empWithEmail = {
          _id: empId,
          companyId: mockCompanyId,
          email: 'resend@example.com',
          fullName: { firstName: 'Resend', lastName: 'User' },
        };
        testEmpModel.findOne = jest.fn().mockResolvedValue(empWithEmail);

        const existingUser = {
          _id: new Types.ObjectId(),
          email: 'resend@example.com',
        };
        testUsersService.findByEmail.mockResolvedValue(existingUser);
        const activateSpy = jest.spyOn(serviceWithEmail, 'activateForUser').mockResolvedValue(1);

        const result = await serviceWithEmail.resendInvite(mockCompanyId, empId.toString(), 'Admin Inviter');
        expect(result).toEqual({ success: true, message: 'Invitation email resent successfully' });
        expect(activateSpy).toHaveBeenCalledWith(existingUser);
        expect(mockEmailService.sendEmployeeInvite).toHaveBeenCalledWith({
          to: 'resend@example.com',
          employeeName: 'Resend User',
          companyName: 'Acme Test Corp',
          inviterName: 'Admin Inviter',
          url: process.env.WEB_URL,
        });
      });
    });
  });
});

