import { Types } from 'mongoose';
import { AccessScopeService, UserContext } from './access-scope.service';

describe('AccessScopeService', () => {
  let service: AccessScopeService;
  let mockEmployeeModel: any;
  let mockTeamModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockEmployeeId = new Types.ObjectId();
  const mockTeamMemberEmployeeId = new Types.ObjectId();
  const mockTeamId = new Types.ObjectId();

  beforeEach(() => {
    mockEmployeeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: mockEmployeeId }]),
      }),
    };

    mockTeamModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: mockTeamId,
            teamLead: mockEmployeeId,
            members: [mockEmployeeId, mockTeamMemberEmployeeId],
          },
        ]),
      }),
    };

    service = new AccessScopeService(mockEmployeeModel, mockTeamModel);
  });

  describe('getEmployeeIdsForUser', () => {
    it('should return empty array if no userId or email provided', async () => {
      const res = await service.getEmployeeIdsForUser();
      expect(res).toEqual([]);
      expect(mockEmployeeModel.find).not.toHaveBeenCalled();
    });

    it('should query employeeModel by userId and email and return ObjectIds', async () => {
      const res = await service.getEmployeeIdsForUser(mockUserId, 'test@example.com');
      expect(res).toEqual([mockEmployeeId]);
      expect(mockEmployeeModel.find).toHaveBeenCalled();
    });
  });

  describe('getTeamContextForUser', () => {
    it('should resolve teamIds, memberEmployeeIds, and leadTeamIds', async () => {
      const context = await service.getTeamContextForUser(mockUserId, 'test@example.com');
      expect(context.teamIds).toEqual([mockTeamId]);
      expect(context.leadTeamIds).toEqual([mockTeamId]);
      expect(context.memberEmployeeIds.map((id) => id.toString())).toContain(mockEmployeeId.toString());
      expect(context.memberEmployeeIds.map((id) => id.toString())).toContain(mockTeamMemberEmployeeId.toString());
    });
  });

  describe('buildFilter', () => {
    it('should return empty filter for system admin or scope "all"', async () => {
      const adminUser: UserContext = { id: mockUserId, is_system_admin: true };
      const filterAdmin = await service.buildFilter('tasks', adminUser, 'own');
      expect(filterAdmin).toEqual({});

      const regularUser: UserContext = { id: mockUserId };
      const filterAll = await service.buildFilter('tasks', regularUser, 'all');
      expect(filterAll).toEqual({});
    });

    it('should build "own" filter for tasks matching assignee, userId, and email', async () => {
      const user: UserContext = { id: mockUserId, email: 'user@example.com' };
      const filter = await service.buildFilter('tasks', user, 'own');
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toEqual(
        expect.arrayContaining([
          { assignee: { $in: [mockEmployeeId] } },
          { userId: new Types.ObjectId(mockUserId) },
          { userId: mockUserId },
          { 'members.email': { $regex: /^user@example.com$/i } },
        ]),
      );
    });

    it('should build "own" filter for projects', async () => {
      const user: UserContext = { id: mockUserId, email: 'user@example.com' };
      const filter = await service.buildFilter('projects', user, 'own');
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toEqual(
        expect.arrayContaining([
          { userId: new Types.ObjectId(mockUserId) },
          { userId: mockUserId },
          { 'members.email': { $regex: /^user@example.com$/i } },
        ]),
      );
    });

    it('should build "own" filter for teams matching lead or member', async () => {
      const user: UserContext = { id: mockUserId };
      const filter = await service.buildFilter('teams', user, 'own');
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toEqual(
        expect.arrayContaining([
          { teamLead: { $in: [mockEmployeeId] } },
          { members: { $in: [mockEmployeeId] } },
        ]),
      );
    });

    it('should build "own" filter for employees and dayoff', async () => {
      const user: UserContext = { id: mockUserId, email: 'user@example.com' };
      const empFilter = await service.buildFilter('employees', user, 'own');
      expect(empFilter).toHaveProperty('$or');

      const dayoffFilter = await service.buildFilter('dayoff', user, 'own');
      expect(dayoffFilter).toHaveProperty('$or');
      expect(dayoffFilter.$or).toEqual(
        expect.arrayContaining([
          { employeeId: { $in: [mockEmployeeId] } },
          { userId: new Types.ObjectId(mockUserId) },
        ]),
      );
    });

    it('should build "team" filter for tasks including member employee IDs and teamIds', async () => {
      const user: UserContext = { id: mockUserId, email: 'user@example.com' };
      const filter = await service.buildFilter('tasks', user, 'team');
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ assignee: expect.anything() }),
          expect.objectContaining({ teamId: expect.anything() }),
          { userId: new Types.ObjectId(mockUserId) },
        ]),
      );
    });

    it('should build "team" filter for projects including user teams', async () => {
      const user: UserContext = { id: mockUserId, email: 'user@example.com' };
      const filter = await service.buildFilter('projects', user, 'team');
      expect(filter).toHaveProperty('$or');
      expect(filter.$or).toEqual(
        expect.arrayContaining([
          { teamId: { $in: [mockTeamId] } },
          { userId: new Types.ObjectId(mockUserId) },
        ]),
      );
    });
  });

  describe('canAccess', () => {
    it('should return false if record is null or undefined', async () => {
      const user: UserContext = { id: mockUserId };
      expect(await service.canAccess('tasks', null, user, 'own')).toBe(false);
      expect(await service.canAccess('tasks', undefined, user, 'team')).toBe(false);
    });

    it('should return true if user is system admin or scope is "all"', async () => {
      const admin: UserContext = { id: mockUserId, is_system_admin: true };
      const regular: UserContext = { id: mockUserId };
      const record = { _id: new Types.ObjectId(), userId: new Types.ObjectId() };

      expect(await service.canAccess('tasks', record, admin, 'own')).toBe(true);
      expect(await service.canAccess('tasks', record, regular, 'all')).toBe(true);
    });

    describe('tasks', () => {
      it('should allow access under scope "own" if user is assignee or creator', async () => {
        const user: UserContext = { id: mockUserId };
        const assignedTask = { assignee: mockEmployeeId };
        const createdTask = { userId: mockUserId };
        const otherTask = { assignee: new Types.ObjectId(), userId: new Types.ObjectId() };

        expect(await service.canAccess('tasks', assignedTask, user, 'own')).toBe(true);
        expect(await service.canAccess('tasks', createdTask, user, 'own')).toBe(true);
        expect(await service.canAccess('tasks', otherTask, user, 'own')).toBe(false);
      });

      it('should allow access under scope "team" if assignee is in team or task is in team', async () => {
        const user: UserContext = { id: mockUserId };
        const teamMemberTask = { assignee: mockTeamMemberEmployeeId };
        const teamTask = { teamId: mockTeamId };
        const outsideTask = {
          assignee: new Types.ObjectId(),
          teamId: new Types.ObjectId(),
          userId: new Types.ObjectId(),
        };

        expect(await service.canAccess('tasks', teamMemberTask, user, 'team')).toBe(true);
        expect(await service.canAccess('tasks', teamTask, user, 'team')).toBe(true);
        expect(await service.canAccess('tasks', outsideTask, user, 'team')).toBe(false);
      });
    });

    describe('projects', () => {
      it('should allow access under scope "own" only if creator/member', async () => {
        const user: UserContext = { id: mockUserId, email: 'user@example.com' };
        const ownProject = { userId: mockUserId };
        const memberProject = { members: [{ email: 'user@example.com' }] };
        const otherProject = { userId: new Types.ObjectId() };

        expect(await service.canAccess('projects', ownProject, user, 'own')).toBe(true);
        expect(await service.canAccess('projects', memberProject, user, 'own')).toBe(true);
        expect(await service.canAccess('projects', otherProject, user, 'own')).toBe(false);
      });

      it('should allow access under scope "team" if project is linked to user team', async () => {
        const user: UserContext = { id: mockUserId };
        const teamProject = { teamId: mockTeamId };
        const otherProject = { teamId: new Types.ObjectId(), userId: new Types.ObjectId() };

        expect(await service.canAccess('projects', teamProject, user, 'team')).toBe(true);
        expect(await service.canAccess('projects', otherProject, user, 'team')).toBe(false);
      });
    });

    describe('teams', () => {
      it('should allow access if user is team lead or member under scope "own" or "team"', async () => {
        const user: UserContext = { id: mockUserId };
        const ownTeam = { _id: mockTeamId, teamLead: mockEmployeeId, members: [mockEmployeeId] };
        const otherTeam = {
          _id: new Types.ObjectId(),
          teamLead: new Types.ObjectId(),
          members: [new Types.ObjectId()],
        };

        expect(await service.canAccess('teams', ownTeam, user, 'own')).toBe(true);
        expect(await service.canAccess('teams', ownTeam, user, 'team')).toBe(true);
        expect(await service.canAccess('teams', otherTeam, user, 'own')).toBe(false);
        expect(await service.canAccess('teams', otherTeam, user, 'team')).toBe(false);
      });
    });

    describe('employees', () => {
      it('should allow access under "own" if record matches employee or userId or email', async () => {
        const user: UserContext = { id: mockUserId, email: 'user@example.com' };
        const ownEmp = { _id: mockEmployeeId, email: 'user@example.com' };
        const otherEmp = { _id: new Types.ObjectId(), email: 'other@example.com' };

        expect(await service.canAccess('employees', ownEmp, user, 'own')).toBe(true);
        expect(await service.canAccess('employees', otherEmp, user, 'own')).toBe(false);
      });

      it('should allow access under "team" if employee is in team context', async () => {
        const user: UserContext = { id: mockUserId };
        const teamEmp = { _id: mockTeamMemberEmployeeId };
        const outsideEmp = { _id: new Types.ObjectId(), userId: new Types.ObjectId() };

        expect(await service.canAccess('employees', teamEmp, user, 'team')).toBe(true);
        expect(await service.canAccess('employees', outsideEmp, user, 'team')).toBe(false);
      });
    });

    describe('dayoff', () => {
      it('should allow access under "own" for own leave and "team" for team member leave', async () => {
        const user: UserContext = { id: mockUserId };
        const ownLeave = { employeeId: mockEmployeeId };
        const teamLeave = { employeeId: mockTeamMemberEmployeeId };
        const otherLeave = { employeeId: new Types.ObjectId(), userId: new Types.ObjectId() };

        expect(await service.canAccess('dayoff', ownLeave, user, 'own')).toBe(true);
        expect(await service.canAccess('dayoff', teamLeave, user, 'own')).toBe(false);

        expect(await service.canAccess('dayoff', ownLeave, user, 'team')).toBe(true);
        expect(await service.canAccess('dayoff', teamLeave, user, 'team')).toBe(true);
        expect(await service.canAccess('dayoff', otherLeave, user, 'team')).toBe(false);
      });
    });
  });
});
