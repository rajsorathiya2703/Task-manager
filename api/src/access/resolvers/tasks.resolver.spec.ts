import {
  isTaskOwner,
  isTaskAssignee,
  isTaskMember,
  isProjectTeamMember,
  isProjectTeamLead,
  resolveTaskRelations,
  isTaskInScope,
  TaskSubject,
  TaskResource,
  TaskProjectContext,
} from './tasks.resolver';

describe('Tasks Relationship Resolver (P1-04 — §6.2 & §6.3)', () => {
  const subjectAlice: TaskSubject = {
    userId: 'user-alice-123',
    email: 'alice@company.com',
    employeeId: 'emp-alice-456',
    teamIds: ['team-alpha-789'],
    leadingTeamIds: ['team-alpha-789'],
  };

  const subjectBob: TaskSubject = {
    userId: 'user-bob-111',
    email: 'bob@company.com',
    employeeId: 'emp-bob-222',
    teamIds: ['team-alpha-789'],
    leadingTeamIds: [],
  };

  const subjectCharlie: TaskSubject = {
    userId: 'user-charlie-333',
    email: 'charlie@other.com',
    employeeId: 'emp-charlie-444',
    teamIds: ['team-beta-999'],
    leadingTeamIds: [],
  };

  describe('isTaskOwner', () => {
    const task: TaskResource = {
      id: 'task-1',
      title: 'Fix issue',
      userId: 'user-alice-123',
    };

    it('returns true when task.userId matches subject.userId', () => {
      expect(isTaskOwner(task, subjectAlice)).toBe(true);
    });

    it('returns false when task.userId does not match subject.userId', () => {
      expect(isTaskOwner(task, subjectBob)).toBe(false);
      expect(isTaskOwner(task, subjectCharlie)).toBe(false);
    });

    it('handles ObjectId-like objects with toString()', () => {
      const taskWithObjectId: TaskResource = {
        userId: { toString: () => 'user-bob-111' },
      };
      expect(isTaskOwner(taskWithObjectId, subjectBob)).toBe(true);
      expect(isTaskOwner(taskWithObjectId, subjectAlice)).toBe(false);
    });
  });

  describe('isTaskAssignee', () => {
    it('matches when assignee is an employeeId string', () => {
      const task: TaskResource = {
        assignee: 'emp-alice-456',
      };
      expect(isTaskAssignee(task, subjectAlice)).toBe(true);
      expect(isTaskAssignee(task, subjectBob)).toBe(false);
    });

    it('matches when assignee is a populated Employee object', () => {
      const task: TaskResource = {
        assignee: {
          _id: 'emp-bob-222',
          userId: 'user-bob-111',
          email: 'bob@company.com',
        },
      };
      expect(isTaskAssignee(task, subjectBob)).toBe(true);
      expect(isTaskAssignee(task, subjectAlice)).toBe(false);
    });

    it('matches when assigneeEmail matches subject email case-insensitively', () => {
      const task: TaskResource = {
        assigneeEmail: 'ALICE@COMPANY.COM',
      };
      expect(isTaskAssignee(task, subjectAlice)).toBe(true);
      expect(isTaskAssignee(task, subjectBob)).toBe(false);
    });
  });

  describe('isTaskMember', () => {
    const task: TaskResource = {
      members: [
        { email: 'bob@company.com', name: 'Bob', status: 'Accepted' },
        { email: 'collab@partner.com', status: 'Pending' },
      ],
    };

    it('returns true when subject.email is in members array', () => {
      expect(isTaskMember(task, subjectBob)).toBe(true);
    });

    it('returns false when subject is not in members array', () => {
      expect(isTaskMember(task, subjectAlice)).toBe(false);
      expect(isTaskMember(task, subjectCharlie)).toBe(false);
    });

    it('handles members as string emails or string IDs', () => {
      const taskWithStrings: TaskResource = {
        members: ['alice@company.com', 'user-charlie-333'],
      };
      expect(isTaskMember(taskWithStrings, subjectAlice)).toBe(true);
      expect(isTaskMember(taskWithStrings, subjectCharlie)).toBe(true);
      expect(isTaskMember(taskWithStrings, subjectBob)).toBe(false);
    });
  });

  describe('isProjectTeamMember', () => {
    const task: TaskResource = {
      id: 'task-proj',
      projectTeamId: 'team-alpha-789',
    };

    it('returns true when subject.teamIds contains the project team ID', () => {
      expect(isProjectTeamMember(task, subjectAlice)).toBe(true);
      expect(isProjectTeamMember(task, subjectBob)).toBe(true);
    });

    it('returns false when subject does not belong to the project team', () => {
      expect(isProjectTeamMember(task, subjectCharlie)).toBe(false);
    });

    it('returns true via context.team.members list', () => {
      const context: TaskProjectContext = {
        team: {
          _id: 'team-custom',
          members: ['emp-charlie-444'],
        },
      };
      expect(isProjectTeamMember({}, subjectCharlie, context)).toBe(true);
      expect(isProjectTeamMember({}, subjectAlice, context)).toBe(false);
    });
  });

  describe('isProjectTeamLead', () => {
    const task: TaskResource = {
      projectTeamId: 'team-alpha-789',
    };

    it('returns true when subject.leadingTeamIds contains the project team ID', () => {
      expect(isProjectTeamLead(task, subjectAlice)).toBe(true);
    });

    it('returns false when subject is member but not lead of the team', () => {
      expect(isProjectTeamLead(task, subjectBob)).toBe(false);
    });

    it('returns false for foreign users', () => {
      expect(isProjectTeamLead(task, subjectCharlie)).toBe(false);
    });

    it('returns true via context.team.teamLead field', () => {
      const context: TaskProjectContext = {
        team: {
          _id: 'team-custom',
          teamLead: 'emp-charlie-444',
        },
      };
      expect(isProjectTeamLead({}, subjectCharlie, context)).toBe(true);
      expect(isProjectTeamLead({}, subjectBob, context)).toBe(false);
    });
  });

  describe('resolveTaskRelations & isTaskInScope (§6.3)', () => {
    const taskOwnedByAliceInTeamAlpha: TaskResource = {
      userId: 'user-alice-123',
      assignee: 'emp-bob-222',
      members: [{ email: 'collab@company.com' }],
      projectTeamId: 'team-alpha-789',
    };

    it('resolves correct relationship map for each subject', () => {
      // Alice: owner, team lead, project team member
      const aliceRel = resolveTaskRelations(
        taskOwnedByAliceInTeamAlpha,
        subjectAlice,
      );
      expect(aliceRel).toEqual({
        isOwner: true,
        isAssignee: false,
        isMember: false,
        isProjectTeamMember: true,
        isProjectTeamLead: true,
      });

      // Bob: assignee, project team member (not owner or lead)
      const bobRel = resolveTaskRelations(
        taskOwnedByAliceInTeamAlpha,
        subjectBob,
      );
      expect(bobRel).toEqual({
        isOwner: false,
        isAssignee: true,
        isMember: false,
        isProjectTeamMember: true,
        isProjectTeamLead: false,
      });

      // Charlie: foreign user (all false)
      const charlieRel = resolveTaskRelations(
        taskOwnedByAliceInTeamAlpha,
        subjectCharlie,
      );
      expect(charlieRel).toEqual({
        isOwner: false,
        isAssignee: false,
        isMember: false,
        isProjectTeamMember: false,
        isProjectTeamLead: false,
      });
    });

    it('correctly maps scope: own (owner OR assignee OR member)', () => {
      // Alice is owner -> in scope
      expect(
        isTaskInScope('own', taskOwnedByAliceInTeamAlpha, subjectAlice),
      ).toBe(true);
      // Bob is assignee -> in scope
      expect(
        isTaskInScope('own', taskOwnedByAliceInTeamAlpha, subjectBob),
      ).toBe(true);
      // Charlie is neither -> out of scope
      expect(
        isTaskInScope('own', taskOwnedByAliceInTeamAlpha, subjectCharlie),
      ).toBe(false);
    });

    it('correctly maps scope: team (own OR project_team_member OR project_team_lead)', () => {
      const taskWithDifferentAssignee: TaskResource = {
        userId: 'user-other',
        assignee: 'emp-other',
        projectTeamId: 'team-alpha-789',
      };

      // Bob is neither owner nor assignee, but belongs to team-alpha -> in scope under team
      expect(
        isTaskInScope('own', taskWithDifferentAssignee, subjectBob),
      ).toBe(false);
      expect(
        isTaskInScope('team', taskWithDifferentAssignee, subjectBob),
      ).toBe(true);

      // Foreign user Charlie is out of scope even under team
      expect(
        isTaskInScope('team', taskWithDifferentAssignee, subjectCharlie),
      ).toBe(false);
    });

    it('correctly maps scope: all and scope: none', () => {
      // all -> always true for anyone
      expect(
        isTaskInScope('all', taskOwnedByAliceInTeamAlpha, subjectCharlie),
      ).toBe(true);
      // none -> always false even for owner
      expect(
        isTaskInScope('none', taskOwnedByAliceInTeamAlpha, subjectAlice),
      ).toBe(false);
    });
  });
});
