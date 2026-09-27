import {
  isTeamLead,
  isTeamMember,
  resolveTeamRelations,
  isTeamInScope,
  TeamSubject,
  TeamResource,
} from './teams.resolver';

describe('Teams Relationship Resolver (P1-10 — §6.2 & §6.3)', () => {
  const subjectAlice: TeamSubject = {
    userId: 'user-alice-123',
    email: 'alice@company.com',
    employeeId: 'emp-alice-456',
    teamIds: ['team-alpha-789'],
    leadingTeamIds: ['team-alpha-789'],
  };

  const subjectBob: TeamSubject = {
    userId: 'user-bob-111',
    email: 'bob@company.com',
    employeeId: 'emp-bob-222',
    teamIds: ['team-alpha-789'],
    leadingTeamIds: [],
  };

  const subjectCharlie: TeamSubject = {
    userId: 'user-charlie-333',
    email: 'charlie@company.com',
    employeeId: 'emp-charlie-444',
    teamIds: ['team-beta-999'],
    leadingTeamIds: ['team-beta-999'],
  };

  const subjectDave: TeamSubject = {
    userId: 'user-dave-555',
    email: 'dave@other.com',
    employeeId: 'emp-dave-666',
    teamIds: [],
    leadingTeamIds: [],
  };

  const teamAlpha: TeamResource = {
    _id: 'team-alpha-789',
    name: 'Team Alpha',
    members: ['emp-alice-456', 'emp-bob-222'],
    teamLead: 'emp-alice-456',
  };

  describe('isTeamLead', () => {
    it('returns true when team._id matches an ID in subject.leadingTeamIds', () => {
      expect(isTeamLead(teamAlpha, subjectAlice)).toBe(true);
      expect(isTeamLead(teamAlpha, subjectBob)).toBe(false);
      expect(isTeamLead(teamAlpha, subjectCharlie)).toBe(false);
      expect(isTeamLead(teamAlpha, subjectDave)).toBe(false);
    });

    it('returns true when team.teamLead matches subject employeeId string', () => {
      const team: TeamResource = {
        _id: 'unregistered-team-1',
        teamLead: 'emp-alice-456',
      };
      expect(isTeamLead(team, subjectAlice)).toBe(true);
      expect(isTeamLead(team, subjectBob)).toBe(false);
    });

    it('returns true when team.teamLead is an ObjectId-like object with toString()', () => {
      const team: TeamResource = {
        _id: 'team-2',
        teamLead: { toString: () => 'emp-charlie-444' },
      };
      expect(isTeamLead(team, subjectCharlie)).toBe(true);
      expect(isTeamLead(team, subjectAlice)).toBe(false);
    });

    it('returns true when team.teamLead is a populated object matching userId or email', () => {
      const team: TeamResource = {
        _id: 'team-3',
        teamLead: {
          _id: 'random-emp-id',
          userId: 'user-bob-111',
          email: 'bob@company.com',
        },
      };
      expect(isTeamLead(team, subjectBob)).toBe(true);
      expect(isTeamLead(team, subjectAlice)).toBe(false);
    });

    it('returns false when team has no teamLead and subject has no leadingTeamIds', () => {
      const team: TeamResource = { _id: 'team-no-lead' };
      expect(isTeamLead(team, subjectDave)).toBe(false);
    });
  });

  describe('isTeamMember', () => {
    it('returns true when team._id matches an ID in subject.teamIds', () => {
      expect(isTeamMember(teamAlpha, subjectAlice)).toBe(true);
      expect(isTeamMember(teamAlpha, subjectBob)).toBe(true);
      expect(isTeamMember(teamAlpha, subjectCharlie)).toBe(false);
      expect(isTeamMember(teamAlpha, subjectDave)).toBe(false);
    });

    it('returns true when team.members contains subject employeeId string', () => {
      const team: TeamResource = {
        _id: 'custom-team-10',
        members: ['emp-bob-222', 'emp-random-999'],
      };
      expect(isTeamMember(team, subjectBob)).toBe(true);
      expect(isTeamMember(team, subjectAlice)).toBe(false);
    });

    it('returns true when team.members contains populated object matching userId or email', () => {
      const team: TeamResource = {
        _id: 'custom-team-20',
        members: [
          { _id: 'emp-random-1', userId: 'user-dave-555', email: 'dave@other.com' },
        ],
      };
      expect(isTeamMember(team, subjectDave)).toBe(true);
      expect(isTeamMember(team, subjectBob)).toBe(false);
    });

    it('returns true for team lead even if not explicitly listed in members array', () => {
      const team: TeamResource = {
        _id: 'custom-team-30',
        members: ['emp-bob-222'],
        teamLead: 'emp-alice-456',
      };
      expect(isTeamMember(team, subjectAlice)).toBe(true);
    });

    it('returns false when user is not member or lead', () => {
      const team: TeamResource = {
        _id: 'custom-team-40',
        members: ['emp-other-1', 'emp-other-2'],
      };
      expect(isTeamMember(team, subjectAlice)).toBe(false);
      expect(isTeamMember(team, subjectBob)).toBe(false);
      expect(isTeamMember(team, subjectDave)).toBe(false);
    });
  });

  describe('resolveTeamRelations', () => {
    it('resolves both isMember and isTeamLead as true for team lead', () => {
      const rel = resolveTeamRelations(teamAlpha, subjectAlice);
      expect(rel).toEqual({
        isMember: true,
        isTeamLead: true,
      });
    });

    it('resolves isMember=true and isTeamLead=false for regular member', () => {
      const rel = resolveTeamRelations(teamAlpha, subjectBob);
      expect(rel).toEqual({
        isMember: true,
        isTeamLead: false,
      });
    });

    it('resolves both false for external user', () => {
      const rel = resolveTeamRelations(teamAlpha, subjectDave);
      expect(rel).toEqual({
        isMember: false,
        isTeamLead: false,
      });
    });
  });

  describe('isTeamInScope (§6.3)', () => {
    it('grants access to any subject under scope all', () => {
      expect(isTeamInScope('all', teamAlpha, subjectAlice)).toBe(true);
      expect(isTeamInScope('all', teamAlpha, subjectBob)).toBe(true);
      expect(isTeamInScope('all', teamAlpha, subjectCharlie)).toBe(true);
      expect(isTeamInScope('all', teamAlpha, subjectDave)).toBe(true);
    });

    it('denies access to all subjects under scope none', () => {
      expect(isTeamInScope('none', teamAlpha, subjectAlice)).toBe(false);
      expect(isTeamInScope('none', teamAlpha, subjectBob)).toBe(false);
      expect(isTeamInScope('none', teamAlpha, subjectCharlie)).toBe(false);
      expect(isTeamInScope('none', teamAlpha, subjectDave)).toBe(false);
    });

    describe('scope own & team', () => {
      it('allows team lead under scope own and team', () => {
        expect(isTeamInScope('own', teamAlpha, subjectAlice)).toBe(true);
        expect(isTeamInScope('team', teamAlpha, subjectAlice)).toBe(true);
      });

      it('allows regular team member under scope own and team', () => {
        expect(isTeamInScope('own', teamAlpha, subjectBob)).toBe(true);
        expect(isTeamInScope('team', teamAlpha, subjectBob)).toBe(true);
      });

      it('denies member of a different team under scope own and team', () => {
        expect(isTeamInScope('own', teamAlpha, subjectCharlie)).toBe(false);
        expect(isTeamInScope('team', teamAlpha, subjectCharlie)).toBe(false);
      });

      it('denies external user under scope own and team', () => {
        expect(isTeamInScope('own', teamAlpha, subjectDave)).toBe(false);
        expect(isTeamInScope('team', teamAlpha, subjectDave)).toBe(false);
      });
    });
  });
});
