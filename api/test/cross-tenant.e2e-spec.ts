/**
 * ============================================================================
 * MC-50: CROSS-TENANT END-TO-END TEST SUITE
 * ============================================================================
 * Tests data isolation and access control across two companies (A and B).
 * Uses the local MongoDB instance (or TEST_MONGODB_URI) for integration tests.
 *
 * All test data uses a unique prefix (e2e_ct_<timestamp>) and is cleaned up
 * in afterAll to avoid polluting the database.
 * ============================================================================
 */

process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager_e2e?retryWrites=false&directConnection=true';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Connection, Types, Model } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';

// ─── Test-unique prefix to avoid collisions ───────────────────────────────────
const RUN_ID = `e2e_ct_${Date.now()}`;

function safeSlug(prefix: string): string {
  return `${prefix}-${RUN_ID}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 40);
}

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  cookies: string[];
}

interface TestCompany {
  slug: string;
  name: string;
  secretCode: string;
  companyId: string;
  owner: TestUser;
  member: TestUser;
}

describe('Cross-Tenant Isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let connection: Connection;
  let userModel: Model<any>;
  let companyModel: Model<any>;
  let membershipModel: Model<any>;
  let employeeModel: Model<any>;
  let taskModel: Model<any>;
  let projectModel: Model<any>;
  let teamModel: Model<any>;
  let leaveTypeModel: Model<any>;
  let leaveApplicationModel: Model<any>;
  let notificationModel: Model<any>;

  let A: TestCompany;
  let B: TestCompany;
  let guestUser: TestUser;

  // Track created IDs for teardown
  const createdUserIds: string[] = [];
  const createdCompanySlugs: string[] = [];

  // ─── Helper: create a user directly in DB and issue a JWT ────────────────
  async function createTestUser(emailSuffix: string): Promise<TestUser> {
    const email = `${RUN_ID}-${emailSuffix}@e2etest.local`;
    const user = await userModel.create({
      authType: 'google',
      googleId: `google-${RUN_ID}-${emailSuffix}`,
      email,
      name: `Test ${emailSuffix}`,
      lastLoginAt: new Date(),
    });
    createdUserIds.push(user._id.toString());

    const secret = configService.get<string>('JWT_ACCESS_SECRET') || 'placeholder_secret';
    const accessToken = jwtService.sign(
      { sub: user._id.toString() },
      { secret, expiresIn: '1h' },
    );

    return {
      id: user._id.toString(),
      email,
      accessToken,
      cookies: [`access_token=${accessToken}`],
    };
  }

  // ─── Helper: create a guest user ─────────────────────────────────────────
  async function createGuestUser(): Promise<TestUser> {
    const user = await userModel.create({
      authType: 'guest',
      guestId: `guest-${RUN_ID}`,
      lastLoginAt: new Date(),
    });
    createdUserIds.push(user._id.toString());

    const secret = configService.get<string>('JWT_ACCESS_SECRET') || 'placeholder_secret';
    const accessToken = jwtService.sign(
      { sub: user._id.toString() },
      { secret, expiresIn: '1h' },
    );

    return {
      id: user._id.toString(),
      email: '',
      accessToken,
      cookies: [`access_token=${accessToken}`],
    };
  }

  // ─── Helper: create a company via API ────────────────────────────────────
  async function createCompany(
    owner: TestUser,
    slug: string,
    name: string,
  ): Promise<{ slug: string; name: string; secretCode: string; companyId: string }> {
    const res = await request(app.getHttpServer())
      .post('/companies')
      .set('Cookie', owner.cookies)
      .send({ name, slug });

    if (res.status !== 201) {
      console.error('CREATE COMPANY ERROR:', res.status, res.body, res.text);
    }
    expect(res.status).toBe(201);

    createdCompanySlugs.push(slug);
    return {
      slug: res.body.company.slug,
      name: res.body.company.name,
      secretCode: res.body.secretCode,
      companyId: res.body.company._id,
    };
  }

  // ─── Helper: join a company via API ──────────────────────────────────────
  async function joinCompany(user: TestUser, slug: string, secretCode: string) {
    return request(app.getHttpServer())
      .post(`/companies/${slug}/join`)
      .set('Cookie', user.cookies)
      .send({ secretCode });
  }

  // ─── Helpers: authenticated requests ─────────────────────────────────────
  function authGet(user: TestUser, url: string) {
    return request(app.getHttpServer())
      .get(url)
      .set('Cookie', user.cookies);
  }

  function authPost(user: TestUser, url: string, body?: any) {
    const req = request(app.getHttpServer())
      .post(url)
      .set('Cookie', user.cookies);
    if (body) req.send(body);
    return req;
  }

  function authPatch(user: TestUser, url: string, body?: any) {
    const req = request(app.getHttpServer())
      .patch(url)
      .set('Cookie', user.cookies);
    if (body) req.send(body);
    return req;
  }

  function authDelete(user: TestUser, url: string) {
    return request(app.getHttpServer())
      .delete(url)
      .set('Cookie', user.cookies);
  }

  // =========================================================================
  // SETUP
  // =========================================================================
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    connection = moduleFixture.get<Connection>(getConnectionToken());

    userModel = connection.model('User');
    companyModel = connection.model('Company');
    membershipModel = connection.model('Membership');
    employeeModel = connection.model('Employee');
    taskModel = connection.model('Task');
    projectModel = connection.model('Project');
    teamModel = connection.model('Team');
    leaveTypeModel = connection.model('LeaveType');
    leaveApplicationModel = connection.model('LeaveApplication');
    notificationModel = connection.model('Notification');

    // ─── Create test users ───────────────────────────────────────────────
    const ownerA = await createTestUser('owner-a');
    const memberA = await createTestUser('member-a');
    const ownerB = await createTestUser('owner-b');
    const memberB = await createTestUser('member-b');
    guestUser = await createGuestUser();

    // ─── Create Company A ────────────────────────────────────────────────
    const compA = await createCompany(ownerA, safeSlug('alpha'), `Alpha Corp ${RUN_ID}`);
    const joinResA = await joinCompany(memberA, compA.slug, compA.secretCode);
    expect(joinResA.status).toBe(201);

    A = {
      ...compA,
      owner: ownerA,
      member: memberA,
    };

    // ─── Create Company B ────────────────────────────────────────────────
    const compB = await createCompany(ownerB, safeSlug('beta'), `Beta Inc ${RUN_ID}`);
    const joinResB = await joinCompany(memberB, compB.slug, compB.secretCode);
    expect(joinResB.status).toBe(201);

    B = {
      ...compB,
      owner: ownerB,
      member: memberB,
    };
  }, 60_000);

  // =========================================================================
  // TEARDOWN
  // =========================================================================
  afterAll(async () => {
    try {
      const userIds = createdUserIds.map((id) => new Types.ObjectId(id));
      await membershipModel.deleteMany({ userId: { $in: userIds } }).exec();

      const companies = await companyModel
        .find({ slug: { $in: createdCompanySlugs } })
        .select('_id')
        .lean()
        .exec();
      const companyIds = companies.map((c: any) => c._id);

      if (companyIds.length > 0) {
        if (taskModel) await taskModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        if (projectModel) await projectModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        if (teamModel) await teamModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        if (employeeModel) await employeeModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        if (leaveTypeModel) await leaveTypeModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        if (leaveApplicationModel) await leaveApplicationModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        if (notificationModel) await notificationModel.deleteMany({ companyId: { $in: companyIds } }).exec();
        await companyModel.deleteMany({ _id: { $in: companyIds } }).exec();
      }

      await userModel.deleteMany({ _id: { $in: userIds } }).exec();
    } catch (err) {
      console.warn('Cleanup warning:', err);
    }

    if (app) {
      await app.close();
    }
  }, 30_000);

  // =========================================================================
  // DATA FIXTURES SETUP IN A AND B
  // =========================================================================
  let projectA_id: string;
  let taskA_id: string;
  let teamA_id: string;
  let employeeA_id: string;
  let leaveTypeA_id: string;
  let leaveAppA_id: string;
  let leaveAppA_token: string;
  let notificationA_id: string;

  let projectB_id: string;
  let employeeB_id: string;
  let teamB_id: string;

  beforeAll(async () => {
    // 1. Project in A
    const projResA = await authPost(A.owner, `/companies/${A.slug}/projects`, {
      name: `Project Alpha ${RUN_ID}`,
    });
    expect(projResA.status).toBe(201);
    projectA_id = projResA.body._id;

    // 2. Team in A
    const teamResA = await authPost(A.owner, `/companies/${A.slug}/teams`, {
      name: `Team Alpha ${RUN_ID}`,
    });
    expect(teamResA.status).toBe(201);
    teamA_id = teamResA.body._id;

    // 3. Employee in A
    const empResA = await authPost(A.owner, `/companies/${A.slug}/employees`, {
      fullName: { firstName: 'Alice', lastName: `Alpha-${RUN_ID}` },
      role: 'Engineer',
      joiningDate: new Date().toISOString(),
      email: `alice-${RUN_ID}@alpha.local`,
    });
    expect(empResA.status).toBe(201);
    employeeA_id = empResA.body._id;

    // 4. Task in A with assignee and project
    const taskResA = await authPost(A.owner, `/companies/${A.slug}/tasks`, {
      title: `Task Alpha ${RUN_ID}`,
      projectId: projectA_id,
      assignee: employeeA_id,
    });
    expect(taskResA.status).toBe(201);
    taskA_id = taskResA.body._id;

    // 4a. Comment on Task A
    const commentResA = await authPost(A.owner, `/companies/${A.slug}/tasks/${taskA_id}/comments`, {
      content: `Comment on Task Alpha ${RUN_ID}`,
    });
    expect(commentResA.status).toBe(201);

    // 4b. Time entry on Task A (push directly to timeEntries for reliable aggregation test)
    await taskModel.updateOne(
      { _id: taskA_id },
      {
        $push: {
          timeEntries: {
            user: {
              name: A.owner.email,
              email: A.owner.email,
            },
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600_000),
            durationSeconds: 3600,
          },
        },
      },
    );

    // 5. Leave Type in A
    const ltResA = await authPost(A.owner, `/companies/${A.slug}/day-off/leave-types`, {
      name: `Sabbatical Alpha ${RUN_ID}`,
      defaultAllocation: 15,
    });
    expect(ltResA.status).toBe(201);
    leaveTypeA_id = ltResA.body._id;

    // 6. Leave Application in A
    leaveAppA_token = `token_${RUN_ID}_approval_key`;
    const leaveAppDoc = await leaveApplicationModel.create({
      companyId: new Types.ObjectId(A.companyId),
      userId: new Types.ObjectId(A.owner.id),
      employeeId: new Types.ObjectId(employeeA_id),
      leaveTypeId: new Types.ObjectId(leaveTypeA_id),
      fromDate: new Date('2026-11-01'),
      toDate: new Date('2026-11-05'),
      totalDays: 4,
      reason: `Alpha vacation ${RUN_ID}`,
      status: 'pending',
      approvalToken: leaveAppA_token,
    });
    leaveAppA_id = leaveAppDoc._id.toString();

    // 7. Notification in A
    const notifDoc = await notificationModel.create({
      companyId: new Types.ObjectId(A.companyId),
      userId: new Types.ObjectId(A.member.id),
      title: `Notice Alpha ${RUN_ID}`,
      message: `Important notification for member A`,
      type: 'leave_request',
      isRead: false,
    });
    notificationA_id = notifDoc._id.toString();

    // ── Create counterpart baseline data in B ─────────────────────────────
    const projResB = await authPost(B.owner, `/companies/${B.slug}/projects`, {
      name: `Project Beta ${RUN_ID}`,
    });
    expect(projResB.status).toBe(201);
    projectB_id = projResB.body._id;

    const teamResB = await authPost(B.owner, `/companies/${B.slug}/teams`, {
      name: `Team Beta ${RUN_ID}`,
    });
    expect(teamResB.status).toBe(201);
    teamB_id = teamResB.body._id;

    const empResB = await authPost(B.owner, `/companies/${B.slug}/employees`, {
      fullName: { firstName: 'Bob', lastName: `Beta-${RUN_ID}` },
      role: 'Designer',
      joiningDate: new Date().toISOString(),
      email: `bob-${RUN_ID}@beta.local`,
    });
    expect(empResB.status).toBe(201);
    employeeB_id = empResB.body._id;
  }, 60_000);

  // =========================================================================
  // 1. LIST ENDPOINTS: Return none of A's data (asserted as B-member and B-owner)
  // =========================================================================
  describe('Data Isolation — List Endpoints', () => {
    // Assertions run for both B.member and B.owner
    const testUsers = [
      { role: 'B-member', getUser: () => B.member },
      { role: 'B-owner', getUser: () => B.owner },
    ];

    testUsers.forEach(({ role, getUser }) => {
      describe(`As ${role}`, () => {
        it('listing projects returns none of A\'s projects', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/projects`);
          expect(res.status).toBe(200);
          const projects = Array.isArray(res.body) ? res.body : res.body.data || [];
          const alphaProjects = projects.filter(
            (p: any) => p._id === projectA_id || p.name?.includes(`Alpha ${RUN_ID}`),
          );
          expect(alphaProjects).toHaveLength(0);
        });

        it('listing tasks returns none of A\'s tasks', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/tasks`);
          expect(res.status).toBe(200);
          const tasks = Array.isArray(res.body) ? res.body : res.body.data || [];
          const alphaTasks = tasks.filter(
            (t: any) => t._id === taskA_id || t.title?.includes(`Alpha ${RUN_ID}`),
          );
          expect(alphaTasks).toHaveLength(0);
        });

        it('listing teams returns none of A\'s teams', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/teams`);
          if (role === 'B-owner') {
            expect(res.status).toBe(200);
          } else {
            expect([200, 403]).toContain(res.status);
          }
          if (res.status === 200) {
            const teams = Array.isArray(res.body) ? res.body : res.body.data || [];
            const alphaTeams = teams.filter(
              (t: any) => t._id === teamA_id || t.name?.includes(`Alpha ${RUN_ID}`),
            );
            expect(alphaTeams).toHaveLength(0);
          }
        });

        it('listing employees returns none of A\'s employees', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/employees`);
          expect(res.status).toBe(200);
          const employees = Array.isArray(res.body) ? res.body : res.body.data || [];
          const alphaEmployees = employees.filter(
            (e: any) => e._id === employeeA_id || e.fullName?.lastName?.includes(`Alpha-${RUN_ID}`),
          );
          expect(alphaEmployees).toHaveLength(0);
        });

        it('listing leave types returns none of A\'s leave types', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/day-off/leave-types`);
          expect(res.status).toBe(200);
          const types = Array.isArray(res.body) ? res.body : res.body.data || [];
          const alphaTypes = types.filter(
            (lt: any) => lt._id === leaveTypeA_id || lt.name?.includes(`Alpha ${RUN_ID}`),
          );
          expect(alphaTypes).toHaveLength(0);
        });

        it('listing notifications returns none of A\'s notifications', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/notifications`);
          expect(res.status).toBe(200);
          const notifs = Array.isArray(res.body) ? res.body : res.body.data || [];
          const alphaNotifs = notifs.filter(
            (n: any) => n._id === notificationA_id || n.title?.includes(`Alpha ${RUN_ID}`),
          );
          expect(alphaNotifs).toHaveLength(0);
        });
      });
    });
  });

  // =========================================================================
  // 2. GET/PATCH/DELETE OF A's IDs UNDER B's SLUG → 404
  // =========================================================================
  describe('Cross-Tenant ID Access Under B\'s Slug → 404', () => {
    const testUsers = [
      { role: 'B-member', getUser: () => B.member },
      { role: 'B-owner', getUser: () => B.owner },
    ];

    testUsers.forEach(({ role, getUser }) => {
      describe(`As ${role}`, () => {
        // Project
        it('GET A\'s project under B\'s slug → 404', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/projects/${projectA_id}`);
          expect(res.status).toBe(404);
        });

        it('PATCH A\'s project under B\'s slug → 404', async () => {
          const res = await authPatch(getUser(), `/companies/${B.slug}/projects/${projectA_id}`, {
            name: 'Malicious Update',
          });
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        it('DELETE A\'s project under B\'s slug → 404', async () => {
          const res = await authDelete(getUser(), `/companies/${B.slug}/projects/${projectA_id}`);
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        // Task
        it('GET A\'s task under B\'s slug → 404', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/tasks/${taskA_id}`);
          expect(res.status).toBe(404);
        });

        it('PATCH A\'s task under B\'s slug → 404', async () => {
          const res = await authPatch(getUser(), `/companies/${B.slug}/tasks/${taskA_id}`, {
            title: 'Malicious Update',
          });
          expect(res.status).toBe(404);
        });

        it('DELETE A\'s task under B\'s slug → 404', async () => {
          const res = await authDelete(getUser(), `/companies/${B.slug}/tasks/${taskA_id}`);
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        // Team
        it('GET A\'s team under B\'s slug → 404', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/teams/${teamA_id}`);
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        it('PATCH A\'s team under B\'s slug → 404', async () => {
          const res = await authPatch(getUser(), `/companies/${B.slug}/teams/${teamA_id}`, {
            name: 'Malicious Update',
          });
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        it('DELETE A\'s team under B\'s slug → 404', async () => {
          const res = await authDelete(getUser(), `/companies/${B.slug}/teams/${teamA_id}`);
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        // Employee
        it('GET A\'s employee under B\'s slug → 404', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/employees/${employeeA_id}`);
          expect(res.status).toBe(404);
        });

        it('PATCH A\'s employee under B\'s slug → 404', async () => {
          const res = await authPatch(getUser(), `/companies/${B.slug}/employees/${employeeA_id}`, {
            role: 'Malicious Role',
          });
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        it('DELETE A\'s employee under B\'s slug → 404', async () => {
          const res = await authDelete(getUser(), `/companies/${B.slug}/employees/${employeeA_id}`);
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        // Leave Type
        it('GET A\'s leave type under B\'s slug → 404', async () => {
          const res = await authGet(getUser(), `/companies/${B.slug}/day-off/leave-types/${leaveTypeA_id}`);
          expect(res.status).toBe(404);
        });

        it('PATCH A\'s leave type under B\'s slug → 404', async () => {
          const res = await authPatch(getUser(), `/companies/${B.slug}/day-off/leave-types/${leaveTypeA_id}`, {
            name: 'Malicious Type',
          });
          // Non-owner gets 403 or 404, owner gets 404
          expect([403, 404]).toContain(res.status);
        });

        it('DELETE A\'s leave type under B\'s slug → 404', async () => {
          const res = await authDelete(getUser(), `/companies/${B.slug}/day-off/leave-types/${leaveTypeA_id}`);
          if (role === 'B-owner') {
            expect(res.status).toBe(404);
          } else {
            expect([403, 404]).toContain(res.status);
          }
        });

        // Leave Application status update
        it('PATCH A\'s leave application under B\'s slug → 404', async () => {
          const res = await authPatch(
            getUser(),
            `/companies/${B.slug}/day-off/applications/${leaveAppA_id}/status`,
            { status: 'approved' },
          );
          expect([403, 404]).toContain(res.status);
        });

        // Notification read update
        it('PATCH A\'s notification under B\'s slug → 404', async () => {
          const res = await authPatch(
            getUser(),
            `/companies/${B.slug}/notifications/${notificationA_id}/read`,
          );
          expect(res.status).toBe(404);
        });
      });
    });
  });

  // =========================================================================
  // 3. REQUESTS TO A's SLUG → 403 (asserted as B-member and B-owner)
  // =========================================================================
  describe('Requests to A\'s Slug → 403', () => {
    const testUsers = [
      { role: 'B-member', getUser: () => B.member },
      { role: 'B-owner', getUser: () => B.owner },
    ];

    testUsers.forEach(({ role, getUser }) => {
      describe(`As ${role}`, () => {
        it('requesting A\'s projects list → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/projects`);
          expect(res.status).toBe(403);
        });

        it('requesting A\'s tasks list → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/tasks`);
          expect(res.status).toBe(403);
        });

        it('requesting A\'s teams list → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/teams`);
          expect(res.status).toBe(403);
        });

        it('requesting A\'s employees list → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/employees`);
          expect(res.status).toBe(403);
        });

        it('requesting A\'s leave types list → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/day-off/leave-types`);
          expect(res.status).toBe(403);
        });

        it('requesting A\'s notifications list → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/notifications`);
          expect(res.status).toBe(403);
        });

        it('requesting A\'s dashboard activity → 403', async () => {
          const res = await authGet(getUser(), `/companies/${A.slug}/dashboard/employee-activity`);
          expect(res.status).toBe(403);
        });

        it('creating a project under A\'s slug → 403', async () => {
          const res = await authPost(getUser(), `/companies/${A.slug}/projects`, {
            name: 'Unauthorized Project',
          });
          expect(res.status).toBe(403);
        });
      });
    });
  });

  // =========================================================================
  // 4. CREATING TASK IN B WITH A's projectId OR assignee → 400
  // =========================================================================
  describe('Foreign Resource Validation in Task Creation', () => {
    it('creating a task in B with A\'s projectId → 400', async () => {
      const res = await authPost(B.owner, `/companies/${B.slug}/tasks`, {
        title: `Task with Foreign Project ${RUN_ID}`,
        projectId: projectA_id,
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/project/i);
    });

    it('creating a task in B with A\'s assignee → 400', async () => {
      const res = await authPost(B.owner, `/companies/${B.slug}/tasks`, {
        title: `Task with Foreign Assignee ${RUN_ID}`,
        projectId: projectB_id,
        assignee: employeeA_id,
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/assignee/i);
    });
  });

  // =========================================================================
  // 5. DASHBOARD: B sees none of A's numbers
  // =========================================================================
  describe('Dashboard Isolation', () => {
    it('B-owner employee-activity dashboard contains none of A\'s numbers', async () => {
      const res = await authGet(B.owner, `/companies/${B.slug}/dashboard/employee-activity`);
      expect(res.status).toBe(200);

      // Verify none of Company A's IDs or titles appear in the response payload
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain(A.companyId);
      expect(stringified).not.toContain(taskA_id);
      expect(stringified).not.toContain(employeeA_id);

      // Verify metrics do not include Company A's 3600 seconds of logged time
      if (res.body.hoursLogged) {
        expect(res.body.hoursLogged).not.toBe(3600);
      }
    });

    it('B-member employee-activity dashboard contains none of A\'s data', async () => {
      const res = await authGet(B.member, `/companies/${B.slug}/dashboard/employee-activity`);
      expect(res.status).toBe(200);
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain(A.companyId);
      expect(stringified).not.toContain(taskA_id);
      expect(stringified).not.toContain(employeeA_id);
    });
  });

  // =========================================================================
  // 6. TIMELINE FOR B IS EMPTY
  // =========================================================================
  describe('Timeline Isolation', () => {
    it('timeline for B is empty for B-owner', async () => {
      const res = await authGet(B.owner, `/companies/${B.slug}/tasks/timeline`);
      expect(res.status).toBe(200);
      expect(res.body.entries).toBeDefined();
      expect(res.body.entries).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('timeline for B is empty for B-member', async () => {
      const res = await authGet(B.member, `/companies/${B.slug}/tasks/timeline`);
      expect(res.status).toBe(200);
      expect(res.body.entries).toBeDefined();
      expect(res.body.entries).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  // =========================================================================
  // 7. PUBLIC APPROVE LINK: A's token under B's slug fails
  // =========================================================================
  describe('Public Approval Link Isolation', () => {
    it('public approve link with A\'s token and id under B\'s slug fails', async () => {
      const res = await request(app.getHttpServer())
        .get(`/companies/${B.slug}/day-off/applications/${leaveAppA_id}/approve?token=${leaveAppA_token}`);

      // Public endpoint returns 200 with HTML message indicating failure
      expect(res.text).toContain('Approval Could Not Be Completed');
      expect(res.text).not.toContain('Leave Approved Successfully');
    });

    it('public approve link under A\'s slug succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/companies/${A.slug}/day-off/applications/${leaveAppA_id}/approve?token=${leaveAppA_token}`);

      expect(res.text).toContain('Leave Approved Successfully');
    });
  });

  // =========================================================================
  // 8. JOIN FLOW: wrong code -> 403; 6 attempts/min -> 429
  // =========================================================================
  // 8. SECRET CODE: REGENERATION AND JOIN FLOW
  // =========================================================================
  describe('Secret Code Regeneration & Join Flow', () => {
    it('wrong secret code → 403', async () => {
      const wrongCodeUser = await createTestUser('wrong-code');
      const res = await joinCompany(wrongCodeUser, A.slug, 'WRONG-SECRET-CODE-00');
      expect(res.status).toBe(403);
    });

    it('non-owner cannot regenerate secret code → 403', async () => {
      const res = await authPost(A.member, `/companies/${A.slug}/regenerate-code`);
      expect(res.status).toBe(403);
    });

    it('regenerating code invalidates the old one', async () => {
      const oldCode = A.secretCode;

      // Owner regenerates code
      const regenRes = await authPost(A.owner, `/companies/${A.slug}/regenerate-code`);
      expect(regenRes.status).toBe(201);
      const newCode = regenRes.body.secretCode;
      expect(newCode).toBeDefined();
      expect(newCode).not.toBe(oldCode);

      // Old code must now fail
      const oldCodeUser = await createTestUser('old-code');
      const resOld = await joinCompany(oldCodeUser, A.slug, oldCode);
      expect(resOld.status).toBe(403);

      // New code must succeed
      const newCodeUser = await createTestUser('new-code');
      const resNew = await joinCompany(newCodeUser, A.slug, newCode);
      expect(resNew.status).toBe(201);

      A.secretCode = newCode;
    });

    it('6 attempts/min on join endpoint → 429', async () => {
      const bruteUser = await createTestUser('brute-force');
      // Throttler allows 5 attempts per 60s
      for (let i = 0; i < 5; i++) {
        await joinCompany(bruteUser, A.slug, `BAD-CODE-${i}`);
      }

      const res = await joinCompany(bruteUser, A.slug, 'BAD-CODE-6');
      expect(res.status).toBe(429);
    });
  });

  // =========================================================================
  // 10. GUEST USER → 403 ON COMPANY ROUTES
  // =========================================================================
  describe('Guest User Restrictions', () => {
    it('guest user → 403 on projects list', async () => {
      const res = await authGet(guestUser, `/companies/${A.slug}/projects`);
      expect(res.status).toBe(403);
    });

    it('guest user → 403 on tasks list', async () => {
      const res = await authGet(guestUser, `/companies/${A.slug}/tasks`);
      expect(res.status).toBe(403);
    });

    it('guest user → 403 on teams list', async () => {
      const res = await authGet(guestUser, `/companies/${A.slug}/teams`);
      expect(res.status).toBe(403);
    });

    it('guest user → 403 on employees list', async () => {
      const res = await authGet(guestUser, `/companies/${A.slug}/employees`);
      expect(res.status).toBe(403);
    });

    it('guest user → 403 on dashboard', async () => {
      const res = await authGet(guestUser, `/companies/${A.slug}/dashboard/employee-activity`);
      expect(res.status).toBe(403);
    });

    it('guest user → 403 on day-off leave types', async () => {
      const res = await authGet(guestUser, `/companies/${A.slug}/day-off/leave-types`);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 11. GLOBAL TENANT GUARD: UN-PREFIXED ROUTES FAIL CLOSED
  // =========================================================================
  describe('Global TenantGuard Protection', () => {
    it('GET /tasks (un-prefixed) → 400 or 404', async () => {
      const res = await authGet(A.owner, '/tasks');
      expect([400, 404]).toContain(res.status);
    });

    it('GET /projects (un-prefixed) → 400 or 404', async () => {
      const res = await authGet(A.owner, '/projects');
      expect([400, 404]).toContain(res.status);
    });

    it('GET /teams (un-prefixed) → 400 or 404', async () => {
      const res = await authGet(A.owner, '/teams');
      expect([400, 404]).toContain(res.status);
    });

    it('GET /employees (un-prefixed) → 400 or 404', async () => {
      const res = await authGet(A.owner, '/employees');
      expect([400, 404]).toContain(res.status);
    });
  });
});
