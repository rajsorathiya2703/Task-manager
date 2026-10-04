# Multi-Company (Multi-Tenant) Support — Requirements Document

**Project:** Task-manager (NestJS API + Next.js web + MongoDB)
**Audience:** Developers and AI coding agents implementing the feature
**Purpose:** Explain *what* we are building, *why*, and *what the finished product must do*. This document is the shared context; the step-by-step task breakdown is a separate document.

---

## 1. Summary

Today the app is a **single-workspace** system: every user sees the same projects, tasks, teams, employees and leave policies. We want to turn it into a **multi-company SaaS** where many independent companies use the same deployment, and **each company's data, people, leave policies and access rights are completely separate**.

Each company gets its own URL space:

```
{baseURL}/{company}/login
{baseURL}/{company}/tasks
{baseURL}/{company}/projects
{baseURL}/{company}/dayoff/calendar
...
```

A person joins a company by proving they know that company's **secret code**. After joining, they see only that company's data, limited by the access rights the company assigned to them.

---

## 2. Why we are doing this

| Problem today | Consequence | What multi-company fixes |
|---|---|---|
| One shared workspace | Two customers would see each other's tasks, employees and salaries | Hard data isolation per company |
| One global set of leave types and one global admin email | Company A cannot have 14 paid days while Company B has 20 | Leave policy, settings and approver email per company |
| `is_system_admin` / `is_employee` are flags on the global `User` | Being admin in one place makes you admin everywhere | Roles and admin status live on the user's *membership in a company* |
| `Employee.email` is globally unique | The same person cannot work for two companies | Uniqueness becomes per company |
| No onboarding for new organisations | We cannot sell the product to more than one customer | Self-service company registration |

**Business outcome:** we can onboard multiple customer companies on one deployment, safely, without manual database work.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Company (tenant)** | An independent organisation using the app. Owns all its data. |
| **Company slug** | Short URL-safe name, e.g. `acme-corp`. Used in URLs. Unique globally. |
| **Company ID** | Internal MongoDB `_id` of the company. Never shown in URLs. |
| **Secret code** | A join code the company shares with its employees, e.g. `ACME-7K3Q-9XPD`. Proves permission to join. |
| **Membership** | Link between one **User** and one **Company**, holding the user's roles and employee link in that company. |
| **User** | A login identity (Google account). Global — one person, one user, possibly many companies. |
| **Employee** | HR record inside a company (name, role, department, payroll fields). Belongs to exactly one company. |
| **Company Owner** | The person who registered the company. Has full rights and can manage the secret code. |
| **Tenant context** | The "current company" resolved from the URL for every API request. |

---

## 4. Goals and non-goals

### Goals
1. Company self-registration with useful company profile data.
2. Company-scoped URLs on both frontend and API.
3. Secret-code based joining flow.
4. Complete data isolation between companies (projects, tasks, teams, employees, leave, notifications, dashboard, chatbot).
5. Per-company roles / access rights (integrates with the access-control plan).
6. Per-company leave policies and leave settings.
7. Existing data migrated into a default company with no data loss.

### Non-goals (out of scope for this feature)
- Billing / Stripe per company.
- Custom domains or subdomains (`acme.app.com`).
- Cross-company reporting or "super admin" console across all companies.
- Single Sign-On (SAML/OIDC) beyond the existing Google login.
- Company deletion / data export (can be a later phase).

---

## 5. Personas

| Persona | Description | Needs |
|---|---|---|
| **Owner (Ravi)** | Founder of Acme Corp. Registers the company. | Register, get secret code, configure leave policies and roles, regenerate code. |
| **Admin / Manager (Meera)** | Runs projects and approves leave at Acme. | Sees all Acme projects/tasks/employees; approves leave. |
| **Employee (Karan)** | Regular staff at Acme. | Joins with code, sees only Acme tasks he has access to, applies for leave. |
| **Multi-company user (Priya)** | Consultant working for Acme and Globex. | One Google login, switches between two companies, sees separate data in each. |

---

## 6. Worked example (use this to sanity check the whole design)

**Step 1 — Registration.** Ravi opens `/register-company`, signs in with Google, and fills the form:
- Company name: *Acme Corp* → slug suggested: `acme-corp`
- Industry: *Software / IT Services*
- Company size: *11–50 employees*
- Country / timezone / currency: *India / Asia/Kolkata / INR*
- Work week: *Mon–Fri*, fiscal year starts *April*

The system creates the company, makes Ravi the **Owner**, creates his **Employee** record, seeds five default roles (System Admin, Admin, Manager, Team Leader, Employee) and four default leave types for Acme, and shows the secret code **once**: `ACME-7K3Q-9XPD`.

**Step 2 — Employee joins.** Karan opens `https://app.example.com/acme-corp/login`. The page shows "Sign in to **Acme Corp**". He signs in with Google, and because he is not a member yet the app asks: *"Enter your company secret code."* He enters `ACME-7K3Q-9XPD`. The system creates his membership with the default *Employee* role and links (or creates) his Employee record by email. He lands on `/acme-corp/dashboard`.

**Step 3 — Isolation.** Globex (another company, slug `globex`) has a project called "Website Redesign". Karan visits `/globex/projects` → **403 Forbidden**. Calling `GET /companies/globex/projects` with Karan's token → **403**. Even if Acme also has a project named "Website Redesign", each company only ever sees its own.

**Step 4 — Different policies.** Acme's *Paid Leave* is 14 days/year, carry-forward 5. Globex's *Paid Leave* is 20 days, no carry-forward. Karan sees 14; a Globex employee sees 20. Leave approval emails for Acme go to `hr@acme.com`, for Globex to `admin@globex.com`.

**Step 5 — Multi-company user.** Priya joins both companies with each company's own code. A switcher in the profile menu shows *Acme Corp* and *Globex*. In Acme she is a *Manager*; in Globex an *Employee*. Her permissions differ accordingly.

---

## 7. Functional requirements

Priority: **M** = must have, **S** = should have.

### 7.1 Company registration
| ID | Requirement | Pri |
|---|---|---|
| FR-REG-1 | Any authenticated (Google) user can register a new company at `/register-company`. | M |
| FR-REG-2 | Form collects: company name, slug (auto-suggested, editable, unique, lowercase `a-z0-9-`), industry, company size range, country, timezone, currency, work week days, fiscal year start month, contact email, phone, address, website (optional), logo (optional). | M |
| FR-REG-3 | On submit the system atomically creates: Company, owner Membership, owner Employee record, default roles, default leave types, default day-off settings. If any step fails, nothing is created. | M |
| FR-REG-4 | A random secret code is generated, stored **hashed**, and shown in plain text **exactly once** with a copy button. | M |
| FR-REG-5 | Reserved slugs are rejected (`login`, `register-company`, `api`, `settings`, `dashboard`, `tasks`, `projects`, `admin`, etc.) so they never collide with app routes. | M |
| FR-REG-6 | Slug availability is checkable live from the form. | S |

**Why:** Without registration we cannot onboard a customer. Industry, size and country give us segmentation data for the business and allow sensible defaults (timezone, currency, work week).

### 7.2 Secret code and joining
| ID | Requirement | Pri |
|---|---|---|
| FR-JOIN-1 | A signed-in user who is **not** a member of company X and visits `/X/...` is redirected to `/X/join`, which asks for the secret code. | M |
| FR-JOIN-2 | Correct code creates a Membership with the company's default role (*Employee*) and links/creates the Employee record by email **inside that company only**. | M |
| FR-JOIN-3 | Wrong code returns 403 with a generic message; the endpoint is rate-limited (5 attempts / minute / user+IP). | M |
| FR-JOIN-4 | The owner can **regenerate** the code at any time. Old code stops working immediately; existing members are unaffected. | M |
| FR-JOIN-5 | The code is never returned by any API after creation/regeneration; only its hash is stored. | M |
| FR-JOIN-6 | Optional per-company setting "require secret code on every login" (default off: code needed only on first join). | S |
| FR-JOIN-7 | Owner can suspend a membership (user loses access without deleting history). | S |

**Why:** The URL alone (`/acme-corp`) is guessable. The secret code stops random people from joining a company just by knowing its name. It is a *join gate*, not a password — real authentication remains Google login + JWT.

### 7.3 Login and routing
| ID | Requirement | Pri |
|---|---|---|
| FR-AUTH-1 | `/{company}/login` shows the company name/logo (from a public endpoint that exposes **only** name and logo) and offers Google sign-in. | M |
| FR-AUTH-2 | All app pages live under `/{company}/...`. Visiting `/` redirects to the user's last-used company, or to a company picker if they belong to several, or to `/register-company` if none. | M |
| FR-AUTH-3 | `GET /auth/me` returns the user plus their list of memberships; when called with a company context it also returns that membership's roles, `employeeId` and `is_employee`. | M |
| FR-AUTH-4 | A company switcher in the profile menu lists the user's companies and navigates to the same page type in the selected company (e.g. `/globex/tasks`). | M |
| FR-AUTH-5 | Guest accounts cannot access company routes (they have no membership). Show a clear message or remove the guest button. | M |
| FR-AUTH-6 | Logout clears the session globally. | M |

### 7.4 Tenant isolation (the core rule)
| ID | Requirement | Pri |
|---|---|---|
| FR-ISO-1 | **Every** tenant-owned record carries a required, indexed `companyId`. | M |
| FR-ISO-2 | **Every** API route that touches tenant data is under `/companies/:companySlug/...` and passes through a `TenantGuard` that verifies the caller has an active membership in that company. | M |
| FR-ISO-3 | **Every** query, update, delete, count **and aggregation pipeline** is filtered by the current `companyId`. A record from another company must behave as "not found". | M |
| FR-ISO-4 | Any foreign reference must point inside the same company (task → project, task → assignee, project → team, team → members, leave → employee). Violations return 400/404. | M |
| FR-ISO-5 | Unique constraints become per-company where relevant (e.g. `Employee.email` unique per company, not globally). | M |
| FR-ISO-6 | Dashboard, timeline, notifications, comments-mentions, mention lists and the AI chatbot only ever read the current company's data. | M |
| FR-ISO-7 | File download / proxy endpoints must verify that the file belongs to a resource in the caller's company. | M |

**Tenant-owned collections (must get `companyId`):** Task, Project, Team, Employee, LeaveType, LeaveApplication, LeaveBalance, DayOffSettings, Notification, Role (from the access-control plan), Membership. Comments are embedded in Task/Team and inherit their parent's company.

**Global collections (no `companyId`):** User, Company.

### 7.5 Per-company data — what "different for each company" means
| Area | Per-company behaviour |
|---|---|
| **Projects & tasks** | Company A's projects/tasks are invisible to B. Statuses and priorities may stay the same set for now. |
| **Teams** | Members and leads must be Employees of the same company. |
| **Employees** | Each company has its own directory. The same email may exist in two companies as two separate Employee records. Payroll fields are company-private. |
| **Leave types & policies** | Each company has its own leave types (name, code, allocation, refill cycle, salary deduction, carry-forward). New companies get defaults that they can edit freely. |
| **Leave balances & applications** | Belong to the employee inside a company. |
| **Day-off settings** | Each company has its own approver email and its own on/off switch for the module. |
| **Roles & access rights** | Each company has its own roles and grants. Editing "Manager" in Acme never affects Globex. |
| **Notifications** | Scoped to (user, company). A Globex notification never appears in Acme. |
| **Dashboard** | Aggregates only the current company's tasks, hours and employees. |
| **AI chatbot** | Tools only operate on the current company's data. |
| **Emails** | Links include the company slug; approver email is the company's. |

### 7.6 Roles and access rights
| ID | Requirement | Pri |
|---|---|---|
| FR-RBAC-1 | `Role` documents belong to a company. Default roles are seeded when a company is created. | M |
| FR-RBAC-2 | A membership holds `roleIds[]` (roles of that company). Effective permissions are merged from all of the member's roles. | M |
| FR-RBAC-3 | `is_system_admin` and `is_employee` stop being global user flags; they are derived from the membership. | M |
| FR-RBAC-4 | The Company Owner always has full access and cannot be locked out by role edits. | M |
| FR-RBAC-5 | Module/field-level enforcement follows the separate ACCESS_CONTROL plan; this feature only guarantees that its data model is company-scoped. | M |

### 7.7 Emails and public links
| ID | Requirement | Pri |
|---|---|---|
| FR-MAIL-1 | Task assignment / invite emails link to `{APP_URL}/{company}/tasks/{id}`. | M |
| FR-MAIL-2 | The leave approval email goes to the company's configured approver and its one-click approve link includes the company; the public approve endpoint verifies the application belongs to that company and the token matches. | M |

---

## 8. Data model (target)

```text
Company
  _id, name, slug (unique), secretCodeHash,
  industry, sizeRange, country, timezone, currency,
  workWeek[], fiscalYearStart, contactEmail, phone, address, website, logoUrl,
  settings { requireCodeOnEveryLogin: boolean },
  ownerUserId, status: active|suspended, createdAt, updatedAt

Membership                      (unique index: userId + companyId)
  _id, userId, companyId, employeeId,
  roleIds[], isCompanyOwner, status: active|suspended, joinedAt

User                            (global — unchanged core)
  authType, googleId, email, name, avatarUrl, lastLoginAt
  (is_employee / is_system_admin removed from here → derived from Membership)

Employee            + companyId   (unique: companyId + email)
Team                + companyId
Project             + companyId
Task                + companyId
LeaveType           + companyId   (unique: companyId + code)
LeaveApplication    + companyId
LeaveBalance        + companyId
DayOffSettings      + companyId   (one per company)
Notification        + companyId
Role                + companyId
```

Recommended indexes: `{ companyId: 1, ... }` as the **prefix** of every frequent query index (e.g. `{ companyId, status }` on Task, `{ companyId, assignee }`).

---

## 9. API design (target)

Public / no company context:
```
POST   /auth/google                       (unchanged)
GET    /auth/me                           → { user, memberships[] }
POST   /companies                         create (authenticated)      → { company, secretCode }  (code shown once)
GET    /companies/mine                    list my companies
GET    /companies/public/:slug            { name, logoUrl }  (public)
GET    /companies/slug-available?slug=    { available }
POST   /companies/:slug/join              { secretCode }  (rate-limited)
```

Company-scoped (all guarded by `JwtAuthGuard` + `TenantGuard`):
```
GET    /companies/:slug/me                membership, roles, employeeId
POST   /companies/:slug/regenerate-code   owner only
PATCH  /companies/:slug                   owner/admin: edit profile
GET|POST|PATCH|DELETE /companies/:slug/tasks[/:id]
GET|POST|PATCH|DELETE /companies/:slug/projects[/:id]
GET|POST|PATCH|DELETE /companies/:slug/teams[/:id]
GET|POST|PATCH|DELETE /companies/:slug/employees[/:id]
GET|POST|PATCH|DELETE /companies/:slug/users[/:id]        (members of this company)
GET    /companies/:slug/dashboard/employee-activity
GET    /companies/:slug/tasks/timeline
/companies/:slug/day-off/...        settings, leave-types, balances, applications
/companies/:slug/notifications
POST   /companies/:slug/chatbot/chat
```

Public but token-authorised (email link):
```
GET    /companies/:slug/day-off/applications/:id/approve?token=...
```

Frontend URLs mirror this: `/{slug}/login`, `/{slug}/join`, `/{slug}/dashboard`, `/{slug}/tasks`, `/{slug}/tasks/:id`, `/{slug}/projects`, `/{slug}/dayoff/...`, `/{slug}/configuration/...`, plus global `/register-company`.

> **Note on "company_id" in the URL:** the requirement was written as `{company_id}`. We use the **slug** as that identifier (readable, shareable). The internal ObjectId is resolved from the slug on the server and never exposed in URLs.

---

## 10. Security requirements

1. **Never trust a client-provided companyId in a body or query.** Company always comes from the URL and is validated against the caller's membership.
2. **Tenant guard is mandatory** on every controller except those explicitly marked `@NoTenant()` (auth, company registration/list/public/join, public approve link).
3. **Aggregation pipelines** (`$facet`, `$lookup`, `$group` in dashboard and timeline) do not receive automatic filtering from Mongoose plugins — each must start with a `$match: { companyId }`, and every `$lookup` target must also be filtered.
4. **Secret code:** ≥ 10 random characters from a non-ambiguous alphabet, hashed with bcrypt/argon2, compared in constant time, throttled, regenerable. Never logged.
5. **Cross-tenant references** (e.g. assigning a task to an employee of another company) must be rejected.
6. **Existing weak spots to fix during this work:** `linkUserByEmail`, `findByEmail`, `findByUserId` currently search all employees; `getActiveTimer` searches by email only; `getMyBalances` guesses the employee from the first leave; `file/view` has no tenant check; day-off seeding runs globally on startup.
7. **Audit:** log company creation, join attempts (success/failure), code regeneration and role changes with `companyId` and `userId`.

---

## 11. Frontend requirements

- Move the app under `web/app/[companyId]/(main)/...` (param holds the slug).
- Provide a `CompanyProvider`/`useCompany()` (slug, name, membership) and a `useCompanyPath()` helper (or `<CompanyLink>`) so **no page hardcodes `/tasks`, `/projects`, etc.** (Sidebar, PageHeader breadcrumbs, board cards, notification links, `router.push` calls, chatbot links.)
- API layer (`web/src/lib/api.ts`) builds `/companies/{slug}/...` URLs from the current company.
- New screens: `/register-company` (2-step wizard, secret code shown once), `/{slug}/login`, `/{slug}/join` (code entry), company switcher, owner "Company settings" page (edit profile, view/regenerate code).
- Browser-stored state (`localStorage` keys such as `comments_read_*`, last-used company) must be namespaced by company.
- Sidebar items (Employees, Users, Leave Policies, Approvals) hide/show by the membership's permissions in the current company.

---

## 12. Migration of existing data

1. Back up the database.
2. Create a **"Default Company"** (slug e.g. `default`) and a temporary secret code.
3. Backfill `companyId` on every existing Task, Project, Team, Employee, LeaveType, LeaveApplication, LeaveBalance, DayOffSettings and Notification.
4. For each existing User with an Employee record (or `is_employee`), create a Membership in the default company; existing `is_system_admin` users get the admin role; pick one to be Company Owner.
5. Recreate indexes (compound unique indexes), then make `companyId` `required: true`.
6. Verify counts before/after per collection.

**Acceptance:** after migration every existing user can log in at `/default/login` and sees exactly the data they saw before.

---

## 13. Acceptance criteria (definition of done)

1. A new user can register a company, receives a one-time secret code, and lands on their company's dashboard.
2. Another user can join using `/{slug}/login` + secret code, and only then sees company pages.
3. A wrong code is refused and throttled after repeated attempts.
4. Two companies with same-named projects, same-email employees and different leave policies never see each other's data through **any** UI page, API endpoint, dashboard chart, timeline, notification, email link or chatbot answer.
5. Requests to `/companies/B/*` by a member of only company A return 403; requests for an ID belonging to another company return 404.
6. A user in two companies can switch between them and has different roles/permissions in each.
7. Leave types, allocation, approver email and roles edited in one company have no effect on another.
8. Owner can regenerate the secret code; the old code stops working.
9. Existing production data works after migration under the default company.
10. Automated cross-tenant tests cover every module (tasks, projects, teams, employees, users, day-off, dashboard, timeline, notifications, chatbot) and pass.

---

## 14. Edge cases to handle

| Case | Expected behaviour |
|---|---|
| Slug already taken | Registration form shows inline error; suggests alternatives. |
| User visits `/unknown-company/login` | Friendly "Company not found" page (no data leak about which slugs exist beyond that). |
| Same email exists as Employee in two companies | Two independent Employee records; joining links only the one in the target company. |
| User joins, then the owner regenerates the code | User stays a member; only new joins need the new code. |
| User removed / suspended in one company | Loses that company only; other memberships unaffected. |
| Owner tries to remove own owner role | Blocked. |
| Task created in Acme with `assignee` from Globex | 400 "Assignee must belong to this company". |
| Public approve link opened for another company's application | Fails (token + company mismatch). |
| Timer running for a task in Acme while user switches to Globex | Timer belongs to the Acme task; the global timer widget shows/links to `/acme-corp/tasks/{id}` and is not shown as a Globex task. |

---

## 15. Delivery phases (overview)

1. **Company & Membership foundation** — schemas, registration, secret code, join, public info.
2. **Tenant context** — TenantGuard, tenant context (AsyncLocalStorage), Mongoose tenant plugin, cross-tenant test harness.
3. **Module-by-module scoping** — Employees → Teams → Projects → Tasks → Timeline → Dashboard → Day-off → Users → Chatbot.
4. **Auth changes** — `/auth/me` memberships, guest handling, move admin/employee flags to membership.
5. **Frontend** — `[companyId]` routing, company path helper, register/login/join screens, switcher, settings.
6. **Emails & public links** — company-aware links and approver email.
7. **Migration & hardening** — backfill, required `companyId`, file endpoint tenant check, full test pass.

> Order matters: Phase 2 (tenant guard/context) must exist before Phase 3, and this feature should be built **before** the access-control (PBAC) plan's Phase 0, because roles must be company-scoped from the beginning.

---

## 16. Rules for the coding agent

1. Add `companyId` to a schema **and** its indexes in the same change; never leave a tenant-owned model unscoped.
2. Never read `companyId` from a request body/query; use the tenant context.
3. When touching a service method, check for aggregation pipelines and `populate`/`$lookup` — scope those too.
4. Write a cross-tenant test for every module you convert (create two companies, prove isolation).
5. Keep changes small: one module or 1–2 files per task, each with a verification step.
6. Do not change behaviour outside the tenant scoping (no unrelated refactors).
7. Ask before changing any public response shape used by the frontend; update the frontend caller in the same task.

---

## 17. Open decisions (confirm before or during Phase 1)

1. Secret code required only on first join (recommended) or on every login?
2. Should guest login be removed entirely?
3. Should a user be allowed to create more than one company? (Assumed: yes.)
4. Is company deletion / data export needed in v1? (Assumed: no.)
5. Which industries appear in the dropdown (fixed list + "Other")?