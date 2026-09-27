import {
  isProjectOwner,
  isProjectTeamMember,
  isProjectTeamLead,
  resolveProjectRelations,
  isProjectInScope,
  ProjectSubject,
  ProjectResource,
  ProjectTeamContext,
} from './projects.resolver';

describe('Projects Relationship Resolver (P1-07 — §6.2 & §6.3)', () => {
  const subjectAlice: ProjectSubject = {
    userId: 'user-alice-123',
    email: 'alice@company.com',
    employeeId: 'emp-alice-456',
    teamIds: ['team-alpha-789'],
    leadingTeamIds: ['team-alpha-789'],
  };

  const subjectBob: ProjectSubject = {
    userId: 'user-bob-111',
    email: 'bob@company.com',
    employeeId: 'emp-bob-222',
    teamIds: ['team-alpha-789'],
    leadingTeamIds: [],
  };

  const subjectCharlie: ProjectSubject = {
    userId: 'user-charlie-333',
    email: 'charlie@company.com',
    employeeId: 'emp-charlie-444',
    teamIds: ['team-beta-999'],
    leadingTeamIds: ['team-beta-999'],
  };

  const subjectDave: ProjectSubject = {
    userId: 'user-dave-555',
    email: 'dave@other.com',
    employeeId: 'emp-dave-666',
    teamIds: [],
    leadingTeamIds: [],
  };

  describe('isProjectOwner', () => {
    const project: ProjectResource = {
      id: 'proj-1',
      name: 'Alpha Project',
      userId: 'user-alice-123',
    };

    it('returns true when project.userId matches subject.userId', () => {
      expect(isProjectOwner(project, subjectAlice)).toBe(true);
    });

    it('returns false when project.userId does not match subject.userId', () => {
      expect(isProjectOwner(project, subjectBob)).toBe(false);
      expect(isProjectOwner(project, subjectCharlie)).toBe(false);
      expect(isProjectOwner(project, subjectDave)).toBe(false);
    });

    it('handles ObjectId-like objects with toString()', () => {
      const projWithObjectId: ProjectResource = {
        userId: { toString: () => 'user-bob-111' },
      };
      expect(isProjectOwner(projWithObjectId, subjectBob)).toBe(true);
      expect(isProjectOwner(projWithObjectId, subjectAlice)).toBe(false);
    });

    it('handles populated user object with _id or id', () => {
      const projWithPopulatedUser: ProjectResource = {
        userId: { _id: 'user-charlie-333', name: 'Charlie' },
      };
      expect(isProjectOwner(projWithPopulatedUser, subjectCharlie)).toBe(true);
      expect(isProjectOwner(projWithPopulatedUser, subjectAlice)).toBe(false);
    });

    it('returns false when subject.userId is missing', () => {
      expect(isProjectOwner(project, {})).toBe(false);
    });
  });

  describe('isProjectTeamMember', () => {
    it('returns true when project.teamId string is in subject.teamIds', () => {
      const project: ProjectResource = {
        id: 'proj-1',
        teamId: 'team-alpha-789',
      };
      expect(isProjectTeamMember(project, subjectAlice)).toBe(true);
      expect(isProjectTeamMember(project, subjectBob)).toBe(true);
      expect(isProjectTeamMember(project, subjectCharlie)).toBe(false);
    });

    it('returns true when project.teamId is an ObjectId-like object', () => {
      const project: ProjectResource = {
        id: 'proj-1',
        teamId: { toString: () => 'team-beta-999' },
      };
      expect(isProjectTeamMember(project, subjectCharlie)).toBe(true);
      expect(isProjectTeamMember(project, subjectAlice)).toBe(false);
    });

    it('returns true when project.team has members array containing subject employeeId', () => {
      const project: ProjectResource = {
        id: 'proj-2',
        team: {
          _id: 'unregistered-team-101',
          members: ['emp-bob-222', 'emp-random-333'],
        },
      };
      expect(isProjectTeamMember(project, subjectBob)).toBe(true);
      expect(isProjectTeamMember(project, subjectDave)).toBe(false);
    });

    it('returns true when team context provides members matching subject userId', () => {
      const project: ProjectResource = { id: 'proj-3' };
      const context: ProjectTeamContext = {
        team: {
          _id: 'team-context-500',
          members: [{ userId: 'user-dave-555' }],
        },
      };
      expect(isProjectTeamMember(project, subjectDave, context)).toBe(true);
      expect(isProjectTeamMember(project, subjectBob, context)).toBe(false);
    });

    it('returns false when project has no team associated', () => {
      const project: ProjectResource = { id: 'proj-solo' };
      expect(isProjectTeamMember(project, subjectAlice)).toBe(false);
      expect(isProjectTeamMember(project, subjectBob)).toBe(false);
    });
  });

  describe('isProjectTeamLead', () => {
    it('returns true when project.teamId is in subject.leadingTeamIds', () => {
      const project: ProjectResource = {
        id: 'proj-1',
        teamId: 'team-alpha-789',
      };
      expect(isProjectTeamLead(project, subjectAlice)).toBe(true);
      expect(isProjectTeamLead(project, subjectBob)).toBe(false); // Bob is member, not lead
    });

    it('returns true when project.team.teamLead matches subject employeeId', () => {
      const project: ProjectResource = {
        id: 'proj-2',
        team: {
          _id: 'team-arbitrary',
          teamLead: 'emp-charlie-444',
        },
      };
      expect(isProjectTeamLead(project, subjectCharlie)).toBe(true);
      expect(isProjectTeamLead(project, subjectAlice)).toBe(false);
    });

    it('returns true when team context specifies teamLead matching subject userId', () => {
      const project: ProjectResource = { id: 'proj-3' };
      const context: ProjectTeamContext = {
        team: {
          _id: 'team-context-lead',
          teamLead: { userId: 'user-bob-111' },
        },
      };
      expect(isProjectTeamLead(project, subjectBob, context)).toBe(true);
      expect(isProjectTeamLead(project, subjectDave, context)).toBe(false);
    });

    it('returns false when subject is not lead or project has no team', () => {
      const projectNoTeam: ProjectResource = { id: 'proj-no-team' };
      expect(isProjectTeamLead(projectNoTeam, subjectAlice)).toBe(false);

      const projectBeta: ProjectResource = { id: 'proj-beta', teamId: 'team-beta-999' };
      expect(isProjectTeamLead(projectBeta, subjectBob)).toBe(false);
    });
  });

  describe('resolveProjectRelations', () => {
    it('computes all relationship flags correctly for owner and team lead', () => {
      const project: ProjectResource = {
        userId: 'user-alice-123',
        teamId: 'team-alpha-789',
      };
      const rel = resolveProjectRelations(project, subjectAlice);
      expect(rel).toEqual({
        isOwner: true,
        isTeamMember: true,
        isTeamLead: true,
      });
    });

    it('computes all relationship flags correctly for pure team member', () => {
      const project: ProjectResource = {
        userId: 'user-alice-123',
        teamId: 'team-alpha-789',
      };
      const rel = resolveProjectRelations(project, subjectBob);
      expect(rel).toEqual({
        isOwner: false,
        isTeamMember: true,
        isTeamLead: false,
      });
    });

    it('computes all relationship flags correctly for outsider', () => {
      const project: ProjectResource = {
        userId: 'user-alice-123',
        teamId: 'team-alpha-789',
      };
      const rel = resolveProjectRelations(project, subjectDave);
      expect(rel).toEqual({
        isOwner: false,
        isTeamMember: false,
        isTeamLead: false,
      });
    });
  });

  describe('isProjectInScope (§6.3)', () => {
    const project: ProjectResource = {
      id: 'proj-scope-test',
      userId: 'user-alice-123',
      teamId: 'team-alpha-789',
    };

    it('grants access to any subject under scope all', () => {
      expect(isProjectInScope('all', project, subjectAlice)).toBe(true);
      expect(isProjectInScope('all', project, subjectBob)).toBe(true);
      expect(isProjectInScope('all', project, subjectCharlie)).toBe(true);
      expect(isProjectInScope('all', project, subjectDave)).toBe(true);
    });

    it('denies access to any subject under scope none', () => {
      expect(isProjectInScope('none', project, subjectAlice)).toBe(false);
      expect(isProjectInScope('none', project, subjectBob)).toBe(false);
      expect(isProjectInScope('none', project, subjectCharlie)).toBe(false);
      expect(isProjectInScope('none', project, subjectDave)).toBe(false);
    });

    describe('scope own', () => {
      it('allows project owner', () => {
        expect(isProjectInScope('own', project, subjectAlice)).toBe(true);
      });

      it('denies team member who is not owner', () => {
        expect(isProjectInScope('own', project, subjectBob)).toBe(false);
      });

      it('denies external user', () => {
        expect(isProjectInScope('own', project, subjectDave)).toBe(false);
      });
    });

    describe('scope team', () => {
      it('allows project owner', () => {
        expect(isProjectInScope('team', project, subjectAlice)).toBe(true);
      });

      it('allows project team member', () => {
        expect(isProjectInScope('team', project, subjectBob)).toBe(true);
      });

      it('denies member of a different team', () => {
        expect(isProjectInScope('team', project, subjectCharlie)).toBe(false);
      });

      it('denies outsider without team', () => {
        expect(isProjectInScope('team', project, subjectDave)).toBe(false);
      });
    });
  });
});
