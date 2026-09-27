# Dynamic Policy & Relationship Access Control — Implementation Plan

This document is the full implementation plan for a **dynamic, relationship-aware, policy-based access control (PBAC)** system in Task Manager. It covers what to build, how decisions are made, how module-level and field-level rights interact, how multiple roles merge without conflicts, how the **frontend** should look and behave, and how the **backend** must still block every unauthorized action.

The UI is **never** the security boundary. Hiding a menu item is convenience. The **central policy engine** is the only authority that can allow or deny an action.

---

## 1. Current state (what exists today)

| Area | Today |
|---|---|
| Auth | JWT (Google / guest). Global `JwtAuthGuard` only checks “logged in”. |
| User flags | `is_system_admin`, `is_employee` on `User`. Employee `role` is a **job title string**, not ACL. |
| Data scope | Services already accept `scope: 'own' \| 'team' \| 'all'`, but controllers often hardcode `true` / `'all'`. |
| Groups | Seed scripts write `usergroups` with `modulePermissions`, `operationPermissions`, `fieldPermissions`. There is **no Nest module, guard, or UI** that uses them. |
| Frontend | Sidebar shows every module to every logged-in user. Forms are fully editable. Direct URLs are not gated. |

**Implication:** we keep JWT, users, employees, teams, and the existing module list. We replace “everyone who is logged in can do everything” with a policy check **before every action**.

---

## 2. Design goals

1. Admins can **create roles** (Admin, Manager, Team Leader, Employee, …) without code changes.
2. Each role has a **priority number** used when merging overlapping role assignments.
3. A user can belong to **many roles**. Effective rights are the **union of grants** (additive), so extra roles never silently remove access.
4. Access is split into:
   - **Module level** — can the user see/use this area of the app, and at what record scope?
   - **Field level** — which fields on a record can be read or updated?
5. Field update is **surgical**: if a user may update only `status`, a PATCH that also changes `priority` is rejected (or stripped and rejected, depending on mode).
6. Field rights **cannot expand** module rights. Module rights **cannot bypass** a more specific field deny.
7. **Relationship** (owner, assignee, team member, team lead, manager of) decides *which records* a grant applies to.
8. A **central policy document** (the compiled policy) is loaded on every request and is the single source of truth.
9. Frontend hides modules and locks fields. Backend independently blocks API, chatbot tools, file URLs, and direct IDs.

---

## 3. Architecture: one decision path

Think of access as four layers (standard policy control points):

```
┌─────────────────────────────────────────────────────────────┐
│  PAP — Policy Administration                                │
│  Role builder UI: modules, fields, scope, priority, members │
└────────────────────────────┬────────────────────────────────┘
                             │ publishes
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Policy Document (compiled JSON, versioned, cached)         │
│  Roles + module grants + field grants + relationship rules  │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   PIP (facts)          PDP (decide)         PEP (enforce)
   who is the user?     allow / deny         Nest guard +
   which record?        + allowedFields      interceptor +
   team / assignee?     + deniedFields       query filter
```

| Piece | Responsibility |
|---|---|
| **PAP** | Configuration screens: Roles, Role members, Module catalog, Field catalog. |
| **Policy Document** | Immutable compiled snapshot: “for this tenant, these are the rules”. Versioned. |
| **PIP** | Loads user, role IDs, employee, team memberships, record owner/assignee. |
| **PDP** | Pure function: `(subject, action, resource, context) → Decision`. |
| **PEP** | NestJS guard (module/action), interceptor (field strip/redact), list filters (scope). |

**Rule:** every write path (REST, chatbot tools, file download, bulk update) must call the PDP. No service method is allowed to skip it.

---

## 4. Vocabulary

| Term | Meaning |
|---|---|
| **Module** | An app area: `tasks`, `projects`, `teams`, `employees`, `users`, `roles`, `dashboard`, `timeline`, `dayoff`, `dayoff.approvals`, `dayoff.policies`, `chatbot`. |
| **Action** | `create`, `read`, `update`, `delete` (plus optional operations like `export`, `approve`, `timer.start`). |
| **Scope** | Which records the grant applies to: `none` < `own` < `team` < `all`. |
| **Field permission** | Per-field `read` / `update` on a module’s model. |
| **Role** | Named bundle of module + field grants + priority + members. |
| **Subject** | The acting user (plus employee/team graph). |
| **Resource** | The target record (`task:abc`, `employee:xyz`) or the module itself for list/create. |
| **Decision** | `{ allow, reason, scope, readableFields, updatableFields, hiddenFields }`. |

Employee job title (`Employee.role`) stays a **display label**. It is not used for authorization. Access comes only from **Role** documents assigned to the user.

---

## 5. What we need to build

### 5.1 Data models (MongoDB)

#### `roles`

```ts
{
  name: string;                 // "Manager"
  slug: string;                 // "manager" unique
  description?: string;
  color?: string;
  priority: number;             // higher number = higher rank (Admin 100, Manager 50, Employee 10)
  isSystem: boolean;            // seed roles cannot be deleted
  isActive: boolean;
  members: ObjectId[];          // User ids
  moduleGrants: ModuleGrant[];
  fieldGrants: FieldGrant[];
}
```

#### `ModuleGrant`

```ts
{
  module: string;               // "tasks"
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  scope: 'none' | 'own' | 'team' | 'all';
  operations?: string[];        // optional extras: "tasks.timer", "dayoff.approve"
}
```

Default if a module is missing from the role: **no access** (`read/create/update/delete = false`, `scope = none`).

#### `FieldGrant`

```ts
{
  module: string;               // "tasks"
  field: string;                // "priority" | "assignee" | "baseSalary"
  read: boolean;
  update: boolean;
}
```

If a field is **not listed**, inherit from the module grant:

- module `read=true` → field readable unless explicitly `read=false`
- module `update=true` → field updatable unless explicitly `update=false`

This is the “opt-out field restriction” model. It is easier for admins: they only configure fields that differ from the module.

#### `policy_documents` (compiled)

```ts
{
  version: number;
  compiledAt: Date;
  hash: string;
  roles: Role[];                // denormalized snapshot
  moduleCatalog: ModuleDef[];
  fieldCatalog: FieldDef[];
}
```

On every role save, recompile and bump `version`. Requests cache the latest version in memory (TTL ~30s or Redis). If `version` changes, cache invalidates.

#### User link

Add to `User`:

```ts
roleIds: ObjectId[];            // optional denormalization
```

Source of truth can remain `roles.members`. Keep `roleIds` on the user for fast login payload. Sync both on assign/unassign.

Keep `is_system_admin` as a **break-glass** flag: it bypasses the engine only if we explicitly document it. Recommendation: map System Admin to a seeded role with priority `1000` and **do not** special-case code paths after migration.

---

### 5.2 Module catalog (dynamic, code-registered)

A single TypeScript registry in the API, e.g. `access/module-catalog.ts`. Adding a new app module later is adding an entry here + wiring the guard. The role UI reads this catalog from `GET /access/catalog`.

| Module id | UI route(s) | Primary model | Typical relationships |
|---|---|---|---|
| `dashboard` | `/dashboard` | aggregated | own / team / all activity |
| `tasks` | `/tasks`, `/tasks/:id` | Task | creator, assignee, project team |
| `projects` | `/projects`, `/projects/:id` | Project | creator, project.teamId |
| `timeline` | `/timeline` | Task timeline | same as tasks |
| `teams` | `/configuration/team` | Team | member, teamLead |
| `employees` | `/configuration/employees` | Employee | self, same team, all |
| `users` | `/configuration/users` | User | (usually admin-only) |
| `roles` | `/configuration/roles` (new) | Role | (admin-only) |
| `dayoff` | `/dayoff/*` | LeaveApplication | applicant, approver |
| `dayoff.approvals` | `/dayoff/approvals` | LeaveApplication | manager/lead |
| `dayoff.policies` | `/dayoff/policies`, `/configuration/day-off` | LeaveType / settings | admin |
| `chatbot` | copilot | uses task/project tools | inherit per-tool module |

Each module lists **fields** for field-level UI:

**Example: `tasks` fields**

`title`, `description`, `status`, `priority`, `startDate`, `dueDate`, `estimatedHours`, `tags`, `assignee`, `members`, `projectId`, `resources`

**Example: `employees` fields**

`fullName`, `email`, `department`, `status`, `joiningDate`, `address`, `baseSalary`, `currency`, `payFrequency`, `bankAccountNumber`, `bankRoutingNumber`, `taxId`

Sensitive payroll fields default to **hidden** on Employee and Team Member roles.

---

### 5.3 Central policy document

The compiled policy is not prose. It is a **machine-readable** document the PDP evaluates on every action.

Conceptual shape:

```json
{
  "version": 42,
  "modules": {
    "tasks": {
      "actions": ["create", "read", "update", "delete", "timer.start"],
      "fields": ["title", "status", "priority", "..."],
      "relationships": ["owner", "assignee", "project_team_member", "project_team_lead"]
    }
  },
  "roles": {
    "manager": {
      "priority": 50,
      "moduleGrants": { "tasks": { "read": true, "update": true, "scope": "team" } },
      "fieldGrants": { "tasks.priority": { "read": true, "update": false } }
    }
  }
}
```

**Evaluation order for one request:**

1. Authenticate JWT → subject.
2. Load subject’s role IDs → fetch grants from current policy version.
3. Identify `module` + `action` from the route/decorator.
4. Check **module grant** (after multi-role merge). If `read` is false for a GET, deny with 403 (do not leak existence with 404 unless we choose IDOR-safe 404 for record-level).
5. If the action targets a **record**, resolve **relationship** and compare to `scope`.
6. For responses: redact `hiddenFields`.
7. For writes: intersect body keys with `updatableFields`. Reject extra keys.

---

## 6. Relationship-based scope (ReBAC)

Module grant answers “can you update tasks?”  
Relationship answers “**this** task?”

### 6.1 Scope ranks

```
none (0)  <  own (1)  <  team (2)  <  all (3)
```

When merging roles, **widest scope wins** (because access is additive).

### 6.2 Relationship resolvers (PIP)

Implement one resolver per module. Examples:

**Task**

| Relation | True when |
|---|---|
| `owner` | `task.userId === subject.userId` |
| `assignee` | task assignee email/id matches subject |
| `member` | subject is in `task.members` |
| `project_team_member` | subject’s employee is in the project’s team |
| `project_team_lead` | subject’s employee is `team.teamLead` |

**Project** — owner, team member, team lead  
**Team** — member, team lead  
**Employee** — self (`employee.userId === subject`), same team, all  
**Day-off** — applicant (self), team lead of applicant, all

### 6.3 Mapping scope → allowed relations

| Scope | Allowed if |
|---|---|
| `own` | owner **or** assignee **or** self (module-specific) |
| `team` | `own` **or** same team / team lead |
| `all` | any record in the tenant |

List endpoints **must filter in the database**, not only after fetch:

- `own` → `{ $or: [ { userId }, { 'assignee.email' }, ... ] }`
- `team` → ids of teams the user belongs to / leads
- `all` → no extra identity filter (still JWT)

A user who guesses `/tasks/someone-elses-id` with `scope=own` gets **403** (or 404). They must not receive the document.

---

## 7. Multi-role merge and priority

A user in **Employee (10)** and **Team Leader (40)** must receive **all grants from both**, without “last role wins” bugs.

### 7.1 Merge algorithm (effective grant)

For each module:

```
create = OR(create of all roles)
read   = OR(read of all roles)
update = OR(update of all roles)
delete = OR(delete of all roles)
scope  = MAX(scope of roles that have read or the relevant action)
operations = UNION(operations)
```

For each field:

```
read   = OR(field.read across roles)   // after applying inherit-from-module
update = OR(field.update across roles)
```

Then apply **module vs field constraints** (section 8).

### 7.2 What priority is for

Priority does **not** subtract permissions. It is used for:

1. **Display** — “primary role” badge on the user (highest priority role).
2. **Deterministic admin UX** — when showing the role editor preview for a user, sort by priority.
3. **Future explicit DENY** — if we later add `denyUpdate: true` on a field, **higher priority deny wins**. Until then, do not introduce denies; additive OR is enough and avoids conflicts.
4. **Break-glass** — System Admin role at priority 1000 always compiles to full catalog rights.

### 7.3 Example

| Role | Tasks module | `tasks.priority` field |
|---|---|---|
| Employee (10) | read, update, scope own | update true |
| Team Leader (40) | read, update, scope team | update false |

**Effective:** module update true, scope **team**, field `priority` update **true** (OR).  
Team Leader’s field restriction does **not** remove the Employee grant. That is intentional: “all access provided in all roles.”

If the business later wants “Team Leader restriction should override Employee,” that is a **deny** policy and must use priority. Do not mix that into v1 without an explicit deny checkbox in the role UI.

---

## 8. Conflict protection: module vs field

This is the core safety net. Field grants are **always more specific**, but they **cannot escalate** privileges.

Let `M` = effective module grant, `F` = effective field grant (after inherit).

| # | Module | Field | Result | Why |
|---|---|---|---|---|
| 1 | `read=false` | `read=true` | Field read **false**. Module not visible. | Cannot view a field of a hidden module. |
| 2 | `read=true` | `read=false` | Field **hidden** (redacted). Module still listed. | Restrict sensitive columns. |
| 3 | `update=false` | `update=true` | Field update **false**. | Cannot edit a field if the module is not updatable. |
| 4 | `update=true` | `update=false` | Field is **read-only** in UI; PATCH of that key denied. | Surgical restriction. |
| 5 | `update=true`, field omitted | inherit | Field updatable. | Default. |
| 6 | `read=false` | any | Entire module 403; no field UI. | |
| 7 | `create=false` | n/a | Hide “New” / POST 403. | Create is module-only. |
| 8 | `delete=false` | n/a | Hide delete; DELETE 403. | Delete is module-only. |

**Invariant (compile-time + runtime):**

```
field.read   ⊆ module.read
field.update ⊆ module.update ∩ field.read
```

You cannot update a field you cannot read. You cannot read a field if you cannot read the module.

The **role editor** must validate this when saving (show a warning and auto-correct): e.g. toggling module `update` off clears all field `update` flags for that module.

The **PDP** must re-apply the invariant even if bad data was saved.

---

## 9. Backend enforcement (PEP) — required on every path

### 9.1 NestJS pieces

| Piece | Job |
|---|---|
| `@RequireAccess({ module: 'tasks', action: 'update' })` | Declarative intent on each controller method. |
| `AccessGuard` | Global (after JWT). Reads metadata, calls PDP for module+action. Record-level check when `:id` is present. |
| `FieldAccessInterceptor` | On GET: redact hidden fields. On PATCH/PUT: reject or strip disallowed keys. |
| `AccessService.can(subject, action, resource)` | Used inside services for nested actions (timer, comments, chatbot tools). |
| `applyScopeFilter(module, subject, baseQuery)` | Injects Mongo filters for lists. |

Replace hardcoded `true` / `'all'` in controllers (`tasks`, `projects`, `teams`, `employees`, `dashboard`, `day-off`, `users`) with values from the Decision.

### 9.2 Write protection (field-level update)

On `PATCH /tasks/:id`:

1. PDP: module `tasks` + `update` + this record in scope? If no → **403**.
2. `bodyKeys = Object.keys(dto)`.
3. `forbidden = bodyKeys - decision.updatableFields`.
4. If `forbidden.length > 0` → **403** with `{ code: 'FIELD_FORBIDDEN', fields: forbidden }`.  
   Prefer **reject** over silent strip so the client cannot think a save succeeded.
5. Persist only allowed keys.

Same for employees (salary fields), users, projects, teams, leave settings.

### 9.3 Read protection

- List: query filter by scope.
- Get by id: if out of scope → 403.
- JSON: delete `hiddenFields` (e.g. `baseSalary`).
- Exports / chatbot / file `GET /tasks/file/view` must use the same PDP (`tasks` + `read` + record).

### 9.4 Chatbot

Each tool in `toolRegistry` maps to a module+action. Before execution:

```
if (!pdp.allow(subject, tool.module, tool.action, resource)) throw Forbidden
```

A user without `tasks.update` must not be able to change status via copilot.

### 9.5 Standard error shape

```json
{
  "statusCode": 403,
  "code": "ACCESS_DENIED",
  "module": "tasks",
  "action": "update",
  "fields": ["priority"],
  "message": "You do not have permission to update field 'priority' on tasks."
}
```

Never return the forbidden document body.

---

## 10. Frontend behaviour

### 10.1 Session payload

Extend `GET /auth/me` (or `GET /access/me`):

```ts
{
  user: { id, name, email, avatarUrl },
  roles: [{ id, name, priority }],
  policyVersion: 42,
  access: {
    dashboard: { create, read, update, delete, scope, fields: { ... } },
    tasks: { ... },
    // one key per catalog module
  }
}
```

`fields` per module:

```ts
{
  title: { read: true, update: true },
  priority: { read: true, update: false },
  baseSalary: { read: false, update: false }
}
```

Wrap the app in `AccessProvider`. Hooks:

- `can(module, action)` → boolean  
- `canField(module, field, 'read' | 'update')`  
- `useModuleAccess(module)`  

### 10.2 Module not granted (no `read`)

**Looks like**

- Sidebar link is **not rendered**.
- Configuration section hides itself if all children are hidden.
- Direct URL `/configuration/users` → dedicated **Access denied** page (not a blank layout, not a redirect loop to dashboard without explanation).
- API still 403 if they call it from DevTools.

**Does not look like** “empty list of users” — that would leak that the module exists and might be confused with “no records”.

### 10.3 Module `read` only (no create/update/delete)

**Looks like**

- Module visible in sidebar.
- List and detail **visible**.
- **No** “Create”, “New task”, “Add employee”.
- **No** delete / archive buttons.
- All inputs `disabled` / read-only text.
- Kanban **drag-and-drop disabled** (status change is update).
- Save button hidden.
- Comments: if comments are a separate operation, hide composer when `tasks.comments` write is false.

**Behaves like** GET works; POST/PATCH/DELETE 403.

### 10.4 Module update, but only some fields

Example: tasks `update=true`, fields `status` update true, `priority` and `assignee` update false, `title` update true.

**Looks like**

- Title: editable input.
- Status: dropdown enabled (and drag-drop allowed **only** if `status` is updatable).
- Priority: visible badge, **no** dropdown; tooltip “View only”.
- Assignee: visible, control disabled.
- Hidden field (`read=false`): section omitted entirely (e.g. salary on employee form).

**Save behaviour**

- Client builds PATCH with **only dirty updatable fields**.
- If a bug sends `priority`, API returns `FIELD_FORBIDDEN`.
- Toast: “You cannot change priority.”

### 10.5 Field `read=false`

- Not in the form.
- Not in list columns.
- Not in CSV export.
- API JSON does not include the key (so React DevTools cannot show it).

### 10.6 Create vs update

- `create=true`, `update=false`: user can open “New” and submit; after create, the record is read-only unless they have update.
- `create=false`, `update=true`: no new records; existing in-scope records editable per fields.

### 10.7 Scope in the UI

Optional but useful:

- Banner on lists: “Showing your tasks only” / “Showing your team” / “Showing all”.
- Team Leader does not see a “company-wide” empty state; they see team records.

Do **not** offer a UI control to switch to `all` if the grant is `team`.

### 10.8 Route map (what to wrap)

| Route | Module |
|---|---|
| `/dashboard` | `dashboard` |
| `/tasks`, `/tasks/:id` | `tasks` |
| `/projects`, `/projects/:id` | `projects` |
| `/timeline` | `timeline` (or inherit `tasks` read) |
| `/configuration/team` | `teams` |
| `/configuration/employees` | `employees` |
| `/configuration/users` | `users` |
| `/configuration/roles` (new) | `roles` |
| `/dayoff/calendar`, requests, history | `dayoff` |
| `/dayoff/approvals` | `dayoff.approvals` |
| `/dayoff/policies`, `/configuration/day-off` | `dayoff.policies` |

`ModuleGate` component:

```tsx
if (!can(module, 'read')) return <AccessDenied module={module} />;
return children;
```

`Field` component:

```tsx
if (!canField(m, name, 'read')) return null;
return <input disabled={!canField(m, name, 'update')} />;
```

### 10.9 Role administration UI (new)

Path: `/configuration/roles` and `/configuration/roles/:id`.

**List:** name, priority, member count, color.

**Editor (two tabs):**

1. **Module access** — matrix: rows = modules, columns = Create / Read / Update / Delete / Scope (`own|team|all`).
2. **Field access** — pick a module → list of fields with Read / Update toggles. Disabled if module read/update is off (conflict protection in the form).

**Members tab:** assign users to the role (multi-select). Users page also shows “Roles” multi-select.

**Priority:** number input with helper: “Higher number wins for display and future deny rules. Permissions still add together.”

**Live preview:** pick a user → show computed effective access (union).

---

## 11. Seeded roles (v1 defaults)

These are data, not hardcoded checks.

| Role | Priority | Intent |
|---|---|---|
| System Admin | 1000 | All modules, scope `all`, all fields. |
| Admin | 100 | All operational modules; maybe lock `roles.delete`. |
| Manager | 60 | Team/all on tasks, projects, day-off approvals; employees read; salary hidden. |
| Team Leader | 40 | `team` scope on tasks/projects/dayoff; no users/roles. |
| Employee | 10 | `own` tasks/projects/dayoff; employees read self; no configuration users/roles. |

After seed, admins clone and edit freely.

---

## 12. Implementation phases

### Phase 0 — Foundations (no product behaviour change yet)

- `access` Nest module: schemas `Role`, `PolicyDocument`.
- Module + field catalogs.
- Policy compiler + in-memory cache.
- PDP unit tests (merge, scope rank, field vs module invariant).
- Seed roles; migrate `is_system_admin` users onto System Admin role.

### Phase 1 — Enforce module level on API

- `@RequireAccess` + `AccessGuard` on all controllers.
- Replace hardcoded scope with Decision.scope.
- 403 contract.
- Frontend: `AccessProvider`, hide sidebar links, `ModuleGate` on routes.

### Phase 2 — Field level

- Field interceptor on PATCH/GET.
- `Field` wrappers on task detail, employee form, project form, user form.
- Read-only vs hidden vs editable as in section 10.

### Phase 3 — Role UI

- CRUD roles, member assignment, catalog-driven matrices, validation of conflicts, policy recompile on save.

### Phase 4 — Hardening

- Chatbot tools, file URLs, dashboard aggregations, day-off approvals.
- Audit log: `{ userId, module, action, resourceId, allow, policyVersion, at }`.
- Tests: multi-role union, IDOR on `/tasks/:id`, salary redaction, PATCH extra fields.

Do not ship Phase 3 without Phase 1. An admin UI with no API guard is worse than no UI.

---

## 13. Suggested API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/access/me` | Effective access for current user |
| GET | `/access/catalog` | Modules + fields for the editor |
| GET | `/access/preview/:userId` | Effective access for another user (needs `roles.read`) |
| GET | `/roles` | List roles |
| POST | `/roles` | Create role |
| PATCH | `/roles/:id` | Update grants / priority / name |
| DELETE | `/roles/:id` | Delete (blocked if `isSystem`) |
| POST | `/roles/:id/members` | Assign users |
| DELETE | `/roles/:id/members/:userId` | Unassign |

All of these are themselves gated by module `roles`.

---

## 14. Testing checklist

**Backend**

- [ ] User with no task read: `GET /tasks` → 403; `GET /tasks/:id` → 403.
- [ ] User with own scope cannot read another user’s task by ID.
- [ ] User with module update but field `priority` false: PATCH `{ status }` 200; PATCH `{ priority }` 403.
- [ ] User with field update true but module update false: PATCH 403.
- [ ] Employee + Team Leader: effective scope is team; both roles’ field allows union to true.
- [ ] Salary `read=false`: GET employee JSON has no `baseSalary`.
- [ ] Chatbot tool denied when module denied.
- [ ] File view URL denied when task not in scope.

**Frontend**

- [ ] Sidebar omits unauthorized modules.
- [ ] Deep link shows Access denied.
- [ ] Read-only module: controls disabled, no save, no drag-drop.
- [ ] Partial field update: only permitted controls enabled; save sends only those keys.
- [ ] Hidden fields not in DOM.
- [ ] After role change, user sees new UI after refresh (or policyVersion poll).

---

## 15. Decisions to keep as product rules

1. **Frontend is cosmetic; PDP is law.**
2. **Missing grant = deny.**
3. **Multi-role = union of allows, widest scope.**
4. **Field cannot exceed module; field can restrict module.**
5. **Reject illegal PATCH keys; do not silently ignore.**
6. **Redact hidden fields in API responses.**
7. **No code checks like `if (roleName === 'manager')`.** Only policy.
8. **Job title ≠ access role.**

---

## 16. File / module map (when we implement)

**API (new)**

- `api/src/access/access.module.ts`
- `api/src/access/policy.compiler.ts`
- `api/src/access/policy.engine.ts` (PDP)
- `api/src/access/access.guard.ts`
- `api/src/access/field-access.interceptor.ts`
- `api/src/access/decorators/require-access.decorator.ts`
- `api/src/access/catalog.ts`
- `api/src/access/resolvers/*.ts` (relationship PIP)
- `api/src/access/schemas/role.schema.ts`
- `api/src/roles/roles.controller.ts`

**API (change)**

- Every controller: `@RequireAccess`
- Stop passing `true` / `'all'` from controllers
- `GET /auth/me` includes access snapshot
- Chatbot `toolRegistry` + `toolContext`

**Web (new)**

- `web/src/contexts/AccessContext.tsx`
- `web/src/components/access/ModuleGate.tsx`
- `web/src/components/access/AccessDenied.tsx`
- `web/src/components/access/BoundField.tsx`
- `web/app/(main)/configuration/roles/`

**Web (change)**

- `Sidebar.tsx` — filter links with `can(module, 'read')`
- Task / project / employee / user forms — `BoundField`
- Board drag-drop — `canField('tasks', 'status', 'update')`

---

This plan is ready to implement in the order of Section 12. The next engineering step is Phase 0: catalogs, role schema, compiler, and PDP tests — still without changing end-user screens.
