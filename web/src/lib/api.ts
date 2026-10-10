import axios from 'axios';
import { clearCache, invalidateTags, cached } from './cache';
import { getInvalidationTags } from './cache-rules';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Module-level Active Company Context ─────────────────────────────────────
let currentCompanySlug: string = '';

export const setCompanySlug = (slug: string) => {
  const next = (slug || '').trim().toLowerCase();
  const changed = currentCompanySlug !== next;
  currentCompanySlug = next;
  if (changed && typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('companySlugChanged', { detail: next }));
    });
  }
};

export const getCompanySlug = (): string => {
  return currentCompanySlug;
};

/**
 * Company Path prefixer: prefixes a path with `/companies/${currentCompanySlug}`.
 * Throws a descriptive error if the company slug has not been initialized.
 */
export const cp = (path: string): string => {
  if (!currentCompanySlug) {
    throw new Error(
      `Tenant context missing: company slug is not set. Call setCompanySlug(slug) before requesting "${path}".`,
    );
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/companies/${currentCompanySlug}${cleanPath}`;
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ─── Mutation-invalidation interceptor ───────────────────────────────────────
// Runs on every successful response. For non-GET requests it invalidates
// the relevant cache tags so subsequent reads see fresh data.
api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method ?? '').toUpperCase();
    if (method !== 'GET') {
      const url = response.config?.url ?? '';
      const tags = getInvalidationTags(method, url);
      if (tags.length > 0) {
        invalidateTags(tags);
      }
    }
    return response;
  },
  (err) => Promise.reject(err),
);

// ─── Auth / error interceptor (existing behaviour preserved) ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest =
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/guest') ||
      originalRequest?.url?.includes('/auth/google') ||
      originalRequest?.url?.includes('/auth/logout');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        processQueue();
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        clearCache(); // terminal 401: wipe the cache so stale /auth/me can't mask the expired session
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ─── 403 Forbidden Access Error Handling ─────────────────────────────
    if (error.response?.status === 403) {
      const data = error.response.data;
      const message =
        typeof data?.message === 'string'
          ? data.message
          : Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.error || 'Access Denied: You do not have permission to perform this action.';

      // If the caller is not a member of this company, redirect to join screen
      if (
        message.includes('You are not a member of this company') &&
        typeof window !== 'undefined'
      ) {
        const slug = currentCompanySlug;
        if (slug) {
          window.location.href = `/${slug}/join`;
          return Promise.reject(error);
        }
      }

      const detail = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message,
        module: data?.module,
        action: data?.action,
        code: data?.code,
        fields: data?.fields,
        url: originalRequest?.url,
        method: originalRequest?.method?.toUpperCase(),
        timestamp: Date.now(),
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:access-denied', { detail }));
      }
    }

    return Promise.reject(error);
  },
);

// ─── Global (Un-prefixed) Auth Endpoints ─────────────────────────────────────
export const authEndpoints = {
  googleLogin: '/auth/google',
  guestLogin: '/auth/guest',
  me: '/auth/me',
};

export const fetchMe = async (
  companySlug?: string,
  opts?: { fresh?: boolean },
): Promise<any> => {
  const targetCompany = companySlug || currentCompanySlug;
  const url = targetCompany
    ? `${authEndpoints.me}?company=${encodeURIComponent(targetCompany)}`
    : authEndpoints.me;
  const key = `me:${targetCompany || '_global'}`;

  return cached(key, () => api.get(url).then((r) => r.data), {
    ttl: 2 * 60 * 1000, // 2 min
    tags: ['me'],
    fresh: opts?.fresh,
  });
};

// ─── Global (Un-prefixed) Company Management Endpoints ──────────────────────
export const companyEndpoints = {
  register: '/companies',
  mine: '/companies/mine',
  slugAvailable: (slug: string) => `/companies/slug-available?slug=${encodeURIComponent(slug)}`,
  publicInfo: (slug: string) => `/companies/public/${encodeURIComponent(slug)}`,
  getOne: (slug: string) => `/companies/${encodeURIComponent(slug)}`,
  join: (slug: string) => `/companies/${encodeURIComponent(slug)}/join`,
  membershipStatus: (slug: string) => `/companies/${encodeURIComponent(slug)}/membership-status`,
  regenerateCode: (slug: string) => `/companies/${encodeURIComponent(slug)}/regenerate-code`,
  update: (slug: string) => `/companies/${encodeURIComponent(slug)}`,
};

export const registerCompany = async (data: any) => {
  const res = await api.post(companyEndpoints.register, data);
  return res.data;
};

export const fetchMyCompanies = async () => {
  const res = await api.get(companyEndpoints.mine);
  return res.data;
};

export const fetchCompany = async (slug: string) => {
  const res = await api.get(companyEndpoints.getOne(slug));
  return res.data;
};

export const fetchCompanyPublicInfo = async (slug: string) => {
  const res = await api.get(companyEndpoints.publicInfo(slug));
  return res.data;
};

export const isSlugAvailable = async (slug: string) => {
  const res = await api.get(companyEndpoints.slugAvailable(slug));
  return res.data;
};

export const joinCompany = async (slug: string, secretCode: string) => {
  const res = await api.post(companyEndpoints.join(slug), { secretCode });
  return res.data;
};

export const fetchMembershipStatus = async (slug: string) => {
  const res = await api.get(companyEndpoints.membershipStatus(slug));
  return res.data;
};

export const regenerateCompanyCode = async (slug: string) => {
  const res = await api.post(companyEndpoints.regenerateCode(slug));
  return res.data;
};

export const updateCompany = async (slug: string, data: any) => {
  const res = await api.patch(companyEndpoints.update(slug), data);
  return res.data;
};

// ─── Helper for MongoDB IDs ──────────────────────────────────────────────────
const toId = (id: any): string =>
  typeof id === 'object' && id !== null ? id._id || id.id || '' : id || '';

// ─── Tenant-Scoped: Tasks ────────────────────────────────────────────────────
export const taskEndpoints = {
  getAll: (projectId?: any) => {
    const pid = toId(projectId);
    return cp(pid ? `/tasks?projectId=${pid}` : '/tasks');
  },
  getOne: (id: any) => cp(`/tasks/${toId(id)}`),
  get create() {
    return cp('/tasks');
  },
  update: (id: any) => cp(`/tasks/${toId(id)}`),
  delete: (id: any) => cp(`/tasks/${toId(id)}`),
  upload: (id: any) => cp(`/tasks/${toId(id)}/upload`),
};

export const fetchTasks = async (
  projectId?: any,
  opts?: { fresh?: boolean },
): Promise<any[]> => {
  const slug = currentCompanySlug;
  const pid = projectId
    ? typeof projectId === 'object'
      ? projectId._id || projectId.id || ''
      : String(projectId)
    : '';
  const key = `tasks:${slug}:${pid || '_all'}`;

  return cached(
    key,
    () => api.get(taskEndpoints.getAll(projectId)).then((r) => r.data),
    {
      ttl: 20 * 1000, // 20 s — tasks change often
      tags: ['tasks'],
      fresh: opts?.fresh,
    },
  );
};

export const createTask = async (data: any) => {
  const res = await api.post(taskEndpoints.create, data);
  return res.data;
};

export const fetchTaskById = async (id: string) => {
  const res = await api.get(taskEndpoints.getOne(id));
  return res.data;
};

export const updateTask = async (id: string, data: any) => {
  const res = await api.patch(taskEndpoints.update(id), data);
  return res.data;
};

export const deleteTask = async (id: string) => {
  const res = await api.delete(taskEndpoints.delete(id));
  return res.data;
};

export const duplicateTask = async (id: string) => {
  const res = await api.post(cp(`/tasks/${toId(id)}/duplicate`));
  return res.data;
};

export const uploadResource = async (id: string, formData: FormData) => {
  const res = await api.post(taskEndpoints.upload(id), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const uploadGenericResource = async (formData: FormData) => {
  const res = await api.post(cp('/tasks/upload'), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const getAttachmentUrl = (url: string, name?: string): string => {
  if (!url) return '';
  const isCloudinaryPdf =
    url.includes('res.cloudinary.com') && url.toLowerCase().includes('.pdf');
  if (isCloudinaryPdf) {
    const apiBase = API_URL.replace(/\/+$/, '');
    return `${apiBase}${cp(
      `/tasks/file/view?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || 'document.pdf')}`,
    )}`;
  }
  return url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const validateUploadFiles = (files: File[]): { valid: boolean; error?: string } => {
  const allowedImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'avif'];
  const allowedVideoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv', '3gp', 'ts'];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    const isVideo = file.type.startsWith('video/') || allowedVideoExts.includes(ext);
    const isImage = file.type.startsWith('image/') || allowedImageExts.includes(ext);

    if (!isPdf && !isVideo && !isImage) {
      return {
        valid: false,
        error: `"${file.name}" has an unsupported format. Supported formats: Images, Videos (up to 10MB), and PDFs (up to 2MB).`,
      };
    }

    if (isPdf && file.size > 2 * 1024 * 1024) {
      return {
        valid: false,
        error: `PDF "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 2MB size limit.`,
      };
    }

    if (isVideo && file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: `Video "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB size limit.`,
      };
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: `Image "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB size limit.`,
      };
    }
  }

  return { valid: true };
};

export const addComment = async (taskId: string, commentData: any) => {
  const res = await api.post(cp(`/tasks/${toId(taskId)}/comments`), commentData);
  return res.data;
};

export const updateComment = async (taskId: string, commentId: string, updateData: any) => {
  const res = await api.patch(cp(`/tasks/${toId(taskId)}/comments/${toId(commentId)}`), updateData);
  return res.data;
};

export const deleteComment = async (taskId: string, commentId: string) => {
  const res = await api.delete(cp(`/tasks/${toId(taskId)}/comments/${toId(commentId)}`));
  return res.data;
};

export const inviteMember = async (taskId: string, inviteData: { email: string; name: string }) => {
  const res = await api.post(cp(`/tasks/${toId(taskId)}/invite`), inviteData);
  return res.data;
};

export const startTaskTimer = async (taskId: string) => {
  const res = await api.post(cp(`/tasks/${toId(taskId)}/timer/start`));
  return res.data;
};

export const stopTaskTimer = async (taskId: string) => {
  const res = await api.post(cp(`/tasks/${toId(taskId)}/timer/stop`));
  return res.data;
};

export const getActiveTimer = async () => {
  const res = await api.get(cp('/tasks/timer/active'));
  return res.data;
};

/**
 * Exposes timeline fetch helper for pages querying timeline directly via queryParams.
 */
export const fetchTimeline = async (
  queryParams?: string | URLSearchParams | Record<string, any>,
) => {
  let qs = '';
  if (typeof queryParams === 'string') {
    qs = queryParams.startsWith('?') ? queryParams : `?${queryParams}`;
  } else if (queryParams instanceof URLSearchParams) {
    const s = queryParams.toString();
    qs = s ? `?${s}` : '';
  } else if (queryParams && typeof queryParams === 'object') {
    const sp = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
    });
    const s = sp.toString();
    qs = s ? `?${s}` : '';
  }
  const res = await api.get(cp(`/tasks/timeline${qs}`));
  return res.data;
};

// ─── Tenant-Scoped: Projects ─────────────────────────────────────────────────
export const projectEndpoints = {
  get getAll() {
    return cp('/projects');
  },
  getOne: (id: any) => cp(`/projects/${toId(id)}`),
  get create() {
    return cp('/projects');
  },
  update: (id: any) => cp(`/projects/${toId(id)}`),
  delete: (id: any) => cp(`/projects/${toId(id)}`),
};

export const fetchProjects = async (opts?: { fresh?: boolean }): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `projects:${slug}`;

  return cached(key, () => api.get(projectEndpoints.getAll).then((r) => r.data), {
    ttl: 60 * 1000, // 1 min
    tags: ['projects'],
    fresh: opts?.fresh,
  });
};

export const createProject = async (data: any) => {
  const res = await api.post(projectEndpoints.create, data);
  return res.data;
};

export const fetchProjectById = async (id: string, opts?: { fresh?: boolean }): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `project:${slug}:${id}`;

  return cached(key, () => api.get(projectEndpoints.getOne(id)).then((r) => r.data), {
    ttl: 60 * 1000, // 1 min
    tags: ['projects'],
    fresh: opts?.fresh,
  });
};

export const updateProject = async (id: string, data: any) => {
  const res = await api.patch(projectEndpoints.update(id), data);
  return res.data;
};

export const deleteProject = async (id: string) => {
  const res = await api.delete(projectEndpoints.delete(id));
  return res.data;
};

// ─── Tenant-Scoped: Teams ────────────────────────────────────────────────────
export const teamEndpoints = {
  get getAll() {
    return cp('/teams');
  },
  getOne: (id: any) => cp(`/teams/${toId(id)}`),
  get create() {
    return cp('/teams');
  },
  update: (id: any) => cp(`/teams/${toId(id)}`),
  delete: (id: any) => cp(`/teams/${toId(id)}`),
};

export const fetchTeams = async (opts?: { fresh?: boolean }): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `teams:${slug}`;

  return cached(key, () => api.get(teamEndpoints.getAll).then((r) => r.data), {
    ttl: 60 * 1000, // 1 min
    tags: ['teams'],
    fresh: opts?.fresh,
  });
};

export const fetchTeamById = async (id: string, opts?: { fresh?: boolean }): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `team:${slug}:${id}`;

  return cached(key, () => api.get(teamEndpoints.getOne(id)).then((r) => r.data), {
    ttl: 60 * 1000, // 1 min
    tags: ['teams'],
    fresh: opts?.fresh,
  });
};

export const createTeam = async (data: any) => {
  const res = await api.post(teamEndpoints.create, data);
  return res.data;
};

export const fetchTeamActiveTasks = async (id: string) => {
  const res = await api.get(cp(`/teams/${toId(id)}/active-tasks`));
  return res.data;
};

export const addTeamComment = async (teamId: string, commentData: any) => {
  const res = await api.post(cp(`/teams/${toId(teamId)}/comments`), commentData);
  return res.data;
};

export const updateTeamComment = async (teamId: string, commentId: string, updateData: any) => {
  const res = await api.patch(cp(`/teams/${toId(teamId)}/comments/${toId(commentId)}`), updateData);
  return res.data;
};

export const deleteTeamComment = async (teamId: string, commentId: string) => {
  const res = await api.delete(cp(`/teams/${toId(teamId)}/comments/${toId(commentId)}`));
  return res.data;
};

// ─── Tenant-Scoped: Employees ────────────────────────────────────────────────
export const employeeEndpoints = {
  get getAll() {
    return cp('/employees');
  },
  getOne: (id: any) => cp(`/employees/${toId(id)}`),
  get create() {
    return cp('/employees');
  },
  update: (id: any) => cp(`/employees/${toId(id)}`),
  delete: (id: any) => cp(`/employees/${toId(id)}`),
};

export const fetchEmployees = async (opts?: { fresh?: boolean }): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `employees:${slug}`;

  return cached(key, () => api.get(employeeEndpoints.getAll).then((r) => r.data), {
    ttl: 2 * 60 * 1000, // 2 min
    tags: ['employees'],
    fresh: opts?.fresh,
  });
};

export const fetchEmployeeById = async (id: string) => {
  const res = await api.get(employeeEndpoints.getOne(id));
  return res.data;
};

export const createEmployee = async (data: any) => {
  const res = await api.post(employeeEndpoints.create, data);
  return res.data;
};

// ─── Tenant-Scoped: Users (Company Members) ──────────────────────────────────
export const userEndpoints = {
  get getAll() {
    return cp('/users');
  },
  getOne: (id: any) => cp(`/users/${toId(id)}`),
  update: (id: any) => cp(`/users/${toId(id)}`),
  delete: (id: any) => cp(`/users/${toId(id)}`),
};

export const fetchUsers = async () => {
  const res = await api.get(userEndpoints.getAll);
  return res.data;
};

export const fetchUserById = async (id: string) => {
  const res = await api.get(userEndpoints.getOne(id));
  return res.data;
};

export const updateUser = async (id: string, data: any) => {
  const res = await api.patch(userEndpoints.update(id), data);
  return res.data;
};

export const deleteUser = async (id: string) => {
  const res = await api.delete(userEndpoints.delete(id));
  return res.data;
};

// ─── Access & Roles (Global) ────────────────────────────────────────────────
export const accessEndpoints = {
  preview: (userId: string) => `/access/preview/${userId}`,
  catalog: '/access/catalog',
};

export const fetchAccessPreview = async (userId: string) => {
  const res = await api.get(accessEndpoints.preview(userId));
  return res.data;
};

export const fetchAccessCatalog = async () => {
  const res = await api.get(accessEndpoints.catalog);
  return res.data;
};

export const roleEndpoints = {
  get getAll() {
    return cp('/roles');
  },
  getOne: (id: any) => cp(`/roles/${toId(id)}`),
  get create() {
    return cp('/roles');
  },
  update: (id: any) => cp(`/roles/${toId(id)}`),
  delete: (id: any) => cp(`/roles/${toId(id)}`),
};

export const fetchRoles = async () => {
  const res = await api.get(roleEndpoints.getAll);
  return res.data;
};

export const fetchRoleById = async (id: string) => {
  const res = await api.get(roleEndpoints.getOne(id));
  return res.data;
};

export const createRole = async (data: any) => {
  const res = await api.post(roleEndpoints.create, data);
  return res.data;
};

export const updateRole = async (id: string, data: any) => {
  const res = await api.patch(roleEndpoints.update(id), data);
  return res.data;
};

export const deleteRole = async (id: string) => {
  const res = await api.delete(roleEndpoints.delete(id));
  return res.data;
};

// ─── Tenant-Scoped: Dashboard / Reports ─────────────────────────────────────
export const fetchEmployeeActivity = async (
  range?: string,
  startDate?: string,
  endDate?: string,
  employeeId?: string,
  opts?: { fresh?: boolean },
): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `dashboard:${slug}:${range ?? 'weekly'}:${startDate ?? ''}:${endDate ?? ''}:${employeeId ?? ''}`;

  const loader = () => {
    const params = new URLSearchParams();
    if (range) params.append('range', range);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId);
    const queryString = params.toString();
    const path = queryString
      ? `/dashboard/employee-activity?${queryString}`
      : '/dashboard/employee-activity';
    return api.get(cp(path)).then((r) => r.data);
  };

  return cached(key, loader, {
    ttl: 30 * 1000, // 30 s
    tags: ['dashboard'],
    fresh: opts?.fresh,
  });
};

// ─── Tenant-Scoped: Day Off Module Endpoints ────────────────────────────────
export const dayOffEndpoints = {
  get settings() {
    return cp('/day-off/settings');
  },
  leaveTypes: (activeOnly?: boolean) =>
    cp(activeOnly ? '/day-off/leave-types?activeOnly=true' : '/day-off/leave-types'),
  leaveType: (id: string) => cp(`/day-off/leave-types/${toId(id)}`),
  balances: (year?: number) => cp(year ? `/day-off/balances?year=${year}` : '/day-off/balances'),
  applications: (params?: { status?: string; year?: number; scope?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.year) sp.append('year', params.year.toString());
    if (params?.scope) sp.append('scope', params.scope);
    const qs = sp.toString();
    return cp(qs ? `/day-off/applications?${qs}` : '/day-off/applications');
  },
  myApplications: (year?: number) =>
    cp(year ? `/day-off/applications/my?year=${year}` : '/day-off/applications/my'),
  get apply() {
    return cp('/day-off/applications');
  },
  cancel: (id: string) => cp(`/day-off/applications/${toId(id)}/cancel`),
  updateStatus: (id: string) => cp(`/day-off/applications/${toId(id)}/status`),
  get notifications() {
    return cp('/notifications');
  },
  markNotificationRead: (id: string) => cp(`/notifications/${toId(id)}/read`),
  get markAllNotificationsRead() {
    return cp('/notifications/read-all');
  },
};

export const fetchDayOffSettings = async () => {
  const res = await api.get(dayOffEndpoints.settings);
  return res.data;
};

export const updateDayOffSettings = async (data: any) => {
  const res = await api.patch(dayOffEndpoints.settings, data);
  return res.data;
};

export const fetchLeaveTypes = async (
  activeOnly?: boolean,
  opts?: { fresh?: boolean },
): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `leaveTypes:${slug}:${activeOnly ? 'active' : 'all'}`;

  return cached(
    key,
    () => api.get(dayOffEndpoints.leaveTypes(activeOnly)).then((r) => r.data),
    {
      ttl: 5 * 60 * 1000, // 5 min — leave types rarely change
      tags: ['dayoff'],
      fresh: opts?.fresh,
    },
  );
};

export const fetchLeaveTypeById = async (id: string) => {
  const res = await api.get(dayOffEndpoints.leaveType(id));
  return res.data;
};

export const createLeaveType = async (data: any) => {
  const res = await api.post(cp('/day-off/leave-types'), data);
  return res.data;
};

export const updateLeaveType = async (id: string, data: any) => {
  const res = await api.patch(dayOffEndpoints.leaveType(id), data);
  return res.data;
};

export const deleteLeaveType = async (id: string) => {
  const res = await api.delete(dayOffEndpoints.leaveType(id));
  return res.data;
};

export const fetchMyLeaveBalances = async (
  year?: number,
  opts?: { fresh?: boolean },
): Promise<any> => {
  const slug = currentCompanySlug;
  const key = `leaveBalances:${slug}:${year ?? 'cur'}`;

  return cached(
    key,
    () => api.get(dayOffEndpoints.balances(year)).then((r) => r.data),
    {
      ttl: 60 * 1000, // 1 min
      tags: ['dayoff'],
      fresh: opts?.fresh,
    },
  );
};

export const fetchMyLeaveApplications = async (
  year?: number,
  opts?: { fresh?: boolean },
): Promise<any[]> => {
  const slug = currentCompanySlug;
  const key = `myLeaveApps:${slug}:${year ?? 'cur'}`;

  return cached(
    key,
    () => api.get(dayOffEndpoints.myApplications(year)).then((r) => r.data),
    {
      ttl: 30 * 1000, // 30 s
      tags: ['dayoff'],
      fresh: opts?.fresh,
    },
  );
};

export const fetchAllLeaveApplications = async (params?: { status?: string; year?: number }) => {
  const res = await api.get(dayOffEndpoints.applications(params));
  return res.data;
};

export const applyForDayOff = async (data: {
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  description?: string;
  isHalfDay?: boolean;
}) => {
  const res = await api.post(dayOffEndpoints.apply, data);
  return res.data;
};

export const cancelDayOffApplication = async (id: string) => {
  const res = await api.patch(dayOffEndpoints.cancel(id));
  return res.data;
};

export const updateDayOffStatus = async (
  id: string,
  status: 'approved' | 'rejected',
  reason?: string,
) => {
  const res = await api.patch(dayOffEndpoints.updateStatus(id), { status, reason });
  return res.data;
};

export const fetchNotifications = async () => {
  const res = await api.get(dayOffEndpoints.notifications);
  return res.data;
};

export const markNotificationRead = async (id: string) => {
  const res = await api.patch(dayOffEndpoints.markNotificationRead(id));
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.post(dayOffEndpoints.markAllNotificationsRead);
  return res.data;
};

// ─── Cache lifecycle helpers (called by auth flows) ──────────────────────────
/**
 * Called by login / guest-login pages after a successful auth response.
 * Clears any stale data from a previous session.
 */
export const onLoginSuccess = (): void => {
  clearCache();
};

/**
 * Called by the logout flow before redirecting to /login.
 */
export const onLogout = (): void => {
  clearCache();
};

// ─── Tenant-Scoped: Chatbot Endpoint URL ────────────────────────────────────
/**
 * Returns the full absolute or relative URL to the company-scoped AI chatbot chat endpoint.
 * Suitable for components using direct fetch() (e.g. ChatbotContext).
 */
export const chatbotEndpoint = (): string => {
  const apiBase = API_URL.replace(/\/+$/, '');
  return `${apiBase}${cp('/chatbot/chat')}`;
};
