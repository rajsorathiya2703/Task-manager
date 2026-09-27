import {
  isSelf,
  isSameTeam,
  resolveEmployeeRelations,
  isEmployeeInScope,
  EmployeeSubject,
  EmployeeResource,
  EmployeeTeamContext,
} from './employees.resolver';

describe('Employees Relationship Resolver (P1-13 — §6.2 & §6.3)', () => {
  const subjectAlice: EmployeeSubject = {
    userId: 'user-alice-101',
    employeeId: 'emp-alice-1',
    email: 'alice@company.com',
    teamIds: ['team-alpha'],
    leadingTeamIds: ['team-alpha'],
  };

  const subjectBob: EmployeeSubject = {
    userId: 'user-bob-102',
    employeeId: 'emp-bob-2',
    email: 'bob@company.com',
    teamIds: ['team-alpha'],
    leadingTeamIds: [],
  };

  const subjectCharlie: EmployeeSubject = {
    userId: 'user-charlie-103',
    employeeId: 'emp-charlie-3',
    email: 'charlie@company.com',
    teamIds: ['team-beta'],
    leadingTeamIds: [],
  };

  const subjectDave: EmployeeSubject = {
    userId: 'user-dave-104',
    employeeId: 'emp-dave-4',
    email: 'dave@other.com',
    teamIds: [],
    leadingTeamIds: [],
  };

  const employeeAlice: EmployeeResource = {
    _id: 'emp-alice-1',
    userId: 'user-alice-101',
    email: 'alice@company.com',
    teamIds: ['team-alpha'],
  };

  const employeeBob: EmployeeResource = {
    _id: 'emp-bob-2',
    userId: 'user-bob-102',
    email: 'bob@company.com',
    teamIds: ['team-alpha'],
  };

  const employeeCharlie: EmployeeResource = {
    _id: 'emp-charlie-3',
    userId: 'user-charlie-103',
    email: 'charlie@company.com',
    teamIds: ['team-beta'],
  };

  const employeeDave: EmployeeResource = {
    _id: 'emp-dave-4',
    userId: 'user-dave-104',
    email: 'dave@other.com',
  };

  describe('isSelf', () => {
    it('returns true when employee.userId matches subject.userId', () => {
      expect(isSelf(employeeAlice, subjectAlice)).toBe(true);
      expect(isSelf(employeeBob, subjectBob)).toBe(true);
      expect(isSelf(employeeAlice, subjectBob)).toBe(false);
    });

    it('returns true when employee.userId is ObjectId-like', () => {
      const empWithObjectId: EmployeeResource = {
        userId: { toString: () => 'user-bob-102' },
      };
      expect(isSelf(empWithObjectId, subjectBob)).toBe(true);
      expect(isSelf(empWithObjectId, subjectAlice)).toBe(false);
    });

    it('returns true when employee._id matches subject.employeeId', () => {
      const empWithoutUserId: EmployeeResource = {
        _id: 'emp-alice-1',
      };
      expect(isSelf(empWithoutUserId, subjectAlice)).toBe(true);
      expect(isSelf(empWithoutUserId, subjectBob)).toBe(false);
    });

    it('returns true when email matches case-insensitively', () => {
      const empWithEmailOnly: EmployeeResource = {
        email: 'ALICE@COMPANY.COM',
      };
      expect(isSelf(empWithEmailOnly, subjectAlice)).toBe(true);
      expect(isSelf(empWithEmailOnly, subjectBob)).toBe(false);
    });

    it('returns false when subject does not match', () => {
      expect(isSelf(employeeAlice, subjectCharlie)).toBe(false);
      expect(isSelf(employeeAlice, subjectDave)).toBe(false);
    });
  });

  describe('isSameTeam', () => {
    it('returns true when context.targetEmployeeTeamIds overlaps with subject.teamIds', () => {
      const context: EmployeeTeamContext = {
        targetEmployeeTeamIds: ['team-alpha'],
      };
      expect(isSameTeam(employeeBob, subjectAlice, context)).toBe(true);
      expect(isSameTeam(employeeBob, subjectCharlie, context)).toBe(false);
    });

    it('returns true when employee.teamIds overlaps directly with subject.teamIds', () => {
      expect(isSameTeam(employeeBob, subjectAlice)).toBe(true);
      expect(isSameTeam(employeeCharlie, subjectAlice)).toBe(false);
    });

    it('returns true when context.teams lists both subject and employee in team members', () => {
      const context: EmployeeTeamContext = {
        teams: [
          {
            _id: 'dynamic-team-10',
            members: ['emp-alice-1', 'emp-dave-4'],
          },
        ],
      };
      expect(isSameTeam(employeeDave, subjectAlice, context)).toBe(true);
      expect(isSameTeam(employeeDave, subjectBob, context)).toBe(false);
    });

    it('returns false when employee belongs to a different team', () => {
      expect(isSameTeam(employeeCharlie, subjectAlice)).toBe(false);
      expect(isSameTeam(employeeBob, subjectCharlie)).toBe(false);
    });

    it('returns false when target employee has no team', () => {
      expect(isSameTeam(employeeDave, subjectAlice)).toBe(false);
    });

    it('returns false when subject has no team', () => {
      expect(isSameTeam(employeeAlice, subjectDave)).toBe(false);
    });
  });

  describe('resolveEmployeeRelations', () => {
    it('resolves isSelf=true and isSameTeam=true when subject views themself on a team', () => {
      const rel = resolveEmployeeRelations(employeeAlice, subjectAlice);
      expect(rel).toEqual({
        isSelf: true,
        isSameTeam: true,
      });
    });

    it('resolves isSelf=false and isSameTeam=true for colleague on same team', () => {
      const rel = resolveEmployeeRelations(employeeBob, subjectAlice);
      expect(rel).toEqual({
        isSelf: false,
        isSameTeam: true,
      });
    });

    it('resolves both false for employee on different team', () => {
      const rel = resolveEmployeeRelations(employeeCharlie, subjectAlice);
      expect(rel).toEqual({
        isSelf: false,
        isSameTeam: false,
      });
    });

    it('resolves both false for unaffiliated user', () => {
      const rel = resolveEmployeeRelations(employeeDave, subjectAlice);
      expect(rel).toEqual({
        isSelf: false,
        isSameTeam: false,
      });
    });
  });

  describe('isEmployeeInScope (§6.3)', () => {
    it('grants access to any employee under scope all', () => {
      expect(isEmployeeInScope('all', employeeAlice, subjectAlice)).toBe(true);
      expect(isEmployeeInScope('all', employeeBob, subjectAlice)).toBe(true);
      expect(isEmployeeInScope('all', employeeCharlie, subjectAlice)).toBe(true);
      expect(isEmployeeInScope('all', employeeDave, subjectAlice)).toBe(true);
    });

    it('denies access to all employees under scope none', () => {
      expect(isEmployeeInScope('none', employeeAlice, subjectAlice)).toBe(false);
      expect(isEmployeeInScope('none', employeeBob, subjectAlice)).toBe(false);
      expect(isEmployeeInScope('none', employeeCharlie, subjectAlice)).toBe(false);
      expect(isEmployeeInScope('none', employeeDave, subjectAlice)).toBe(false);
    });

    describe('scope own', () => {
      it('allows self', () => {
        expect(isEmployeeInScope('own', employeeAlice, subjectAlice)).toBe(true);
        expect(isEmployeeInScope('own', employeeBob, subjectBob)).toBe(true);
      });

      it('denies colleague on same team under scope own', () => {
        expect(isEmployeeInScope('own', employeeBob, subjectAlice)).toBe(false);
      });

      it('denies employee on different team', () => {
        expect(isEmployeeInScope('own', employeeCharlie, subjectAlice)).toBe(false);
      });
    });

    describe('scope team', () => {
      it('allows self', () => {
        expect(isEmployeeInScope('team', employeeAlice, subjectAlice)).toBe(true);
      });

      it('allows colleague on same team', () => {
        expect(isEmployeeInScope('team', employeeBob, subjectAlice)).toBe(true);
      });

      it('denies employee on different team', () => {
        expect(isEmployeeInScope('team', employeeCharlie, subjectAlice)).toBe(false);
      });

      it('denies employee without team', () => {
        expect(isEmployeeInScope('team', employeeDave, subjectAlice)).toBe(false);
      });
    });
  });
});
