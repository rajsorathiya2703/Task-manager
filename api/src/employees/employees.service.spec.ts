import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EmployeesService } from './employees.service';
import { Employee } from './schemas/employee.schema';
import { Team } from '../teams/schemas/team.schema';
import { UsersService } from '../users/users.service';

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
      this.save = jest.fn().mockResolvedValue(this);
    }
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
  });
});
