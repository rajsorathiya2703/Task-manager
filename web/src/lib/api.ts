import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
        // Try refresh token using plain axios to prevent recursive interceptor calls
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        processQueue();
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authEndpoints = {

  googleLogin: '/auth/google',
  guestLogin: '/auth/guest',
  me: '/auth/me',
};

export const fetchMe = async () => {
  const res = await api.get(authEndpoints.me);
  return res.data;
};

const toId = (id: any): string => (typeof id === 'object' && id !== null ? (id._id || id.id || '') : (id || ''));

export const taskEndpoints = {
  getAll: (projectId?: any) => {
    const pid = toId(projectId);
    return pid ? `/tasks?projectId=${pid}` : '/tasks';
  },
  getOne: (id: any) => `/tasks/${toId(id)}`,
  create: '/tasks',
  update: (id: any) => `/tasks/${toId(id)}`,
  delete: (id: any) => `/tasks/${toId(id)}`,
  upload: (id: any) => `/tasks/${toId(id)}/upload`,
};

export const projectEndpoints = {
  getAll: '/projects',
  getOne: (id: any) => `/projects/${toId(id)}`,
  create: '/projects',
  update: (id: any) => `/projects/${toId(id)}`,
  delete: (id: any) => `/projects/${toId(id)}`,
};

export const teamEndpoints = {
  getAll: '/teams',
  getOne: (id: any) => `/teams/${toId(id)}`,
  create: '/teams',
  update: (id: any) => `/teams/${toId(id)}`,
  delete: (id: any) => `/teams/${toId(id)}`,
};

export const employeeEndpoints = {
  getAll: '/employees',
  getOne: (id: any) => `/employees/${toId(id)}`,
  create: '/employees',
  update: (id: any) => `/employees/${toId(id)}`,
  delete: (id: any) => `/employees/${toId(id)}`,
};
export const fetchTasks = async (projectId?: any) => {
  const res = await api.get(taskEndpoints.getAll(projectId));
  return res.data;
};

export const fetchProjects = async () => {
  const res = await api.get(projectEndpoints.getAll);
  return res.data;
};

export const createProject = async (data: any) => {
  const res = await api.post(projectEndpoints.create, data);
  return res.data;
};

export const fetchProjectById = async (id: string) => {
  const res = await api.get(projectEndpoints.getOne(id));
  return res.data;
};

export const updateProject = async (id: string, data: any) => {
  const res = await api.patch(projectEndpoints.update(id), data);
  return res.data;
};

export const deleteProject = async (id: string) => {
  const res = await api.delete(projectEndpoints.delete(id));
  return res.data;
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
  const res = await api.post(`/tasks/${id}/duplicate`);
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
  const res = await api.post('/tasks/upload', formData, {
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
    return `${apiBase}/tasks/file/view?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || 'document.pdf')}`;
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
  const res = await api.post(`/tasks/${taskId}/comments`, commentData);
  return res.data;
};

export const updateComment = async (taskId: string, commentId: string, updateData: any) => {
  const res = await api.patch(`/tasks/${taskId}/comments/${commentId}`, updateData);
  return res.data;
};

export const deleteComment = async (taskId: string, commentId: string) => {
  const res = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
  return res.data;
};

export const inviteMember = async (taskId: string, inviteData: { email: string; name: string }) => {
  const res = await api.post(`/tasks/${taskId}/invite`, inviteData);
  return res.data;
};

export const startTaskTimer = async (taskId: string) => {
  const res = await api.post(`/tasks/${taskId}/timer/start`);
  return res.data;
};

export const stopTaskTimer = async (taskId: string) => {
  const res = await api.post(`/tasks/${taskId}/timer/stop`);
  return res.data;
};

export const getActiveTimer = async () => {
  const res = await api.get('/tasks/timer/active');
  return res.data;
};

// Teams
export const fetchTeams = async () => {
  const res = await api.get(teamEndpoints.getAll);
  return res.data;
};

export const fetchTeamById = async (id: string) => {
  const res = await api.get(teamEndpoints.getOne(id));
  return res.data;
};

export const createTeam = async (data: any) => {
  const res = await api.post(teamEndpoints.create, data);
  return res.data;
};

// Employees
export const fetchEmployees = async () => {
  const res = await api.get(employeeEndpoints.getAll);
  return res.data;
};

export const fetchEmployeeById = async (id: string) => {
  const res = await api.get(employeeEndpoints.getOne(id));
  return res.data;
};

export const createEmployee = async (data: any) => {
  const res = await api.post(employeeEndpoints.create, data);
  return res.data;
};

// Team Advanced
export const fetchTeamActiveTasks = async (id: string) => {
  const res = await api.get(`/teams/${id}/active-tasks`);
  return res.data;
};

export const addTeamComment = async (teamId: string, commentData: any) => {
  const res = await api.post(`/teams/${teamId}/comments`, commentData);
  return res.data;
};

export const updateTeamComment = async (teamId: string, commentId: string, updateData: any) => {
  const res = await api.patch(`/teams/${teamId}/comments/${commentId}`, updateData);
  return res.data;
};

export const deleteTeamComment = async (teamId: string, commentId: string) => {
  const res = await api.delete(`/teams/${teamId}/comments/${commentId}`);
  return res.data;
};


// Users
export const userEndpoints = {
  getAll: '/users',
  getOne: (id: any) => `/users/${toId(id)}`,
  update: (id: any) => `/users/${toId(id)}`,
  delete: (id: any) => `/users/${toId(id)}`,
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



export const fetchEmployeeActivity = async (range?: string, startDate?: string, endDate?: string, employeeId?: string) => {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (employeeId) params.append('employeeId', employeeId);
  const queryString = params.toString();
  const url = queryString ? `/dashboard/employee-activity?${queryString}` : '/dashboard/employee-activity';
  const res = await api.get(url);
  return res.data;
};

// --- Day Off Module Endpoints ---
export const dayOffEndpoints = {
  settings: '/day-off/settings',
  leaveTypes: (activeOnly?: boolean) => activeOnly ? '/day-off/leave-types?activeOnly=true' : '/day-off/leave-types',
  leaveType: (id: string) => `/day-off/leave-types/${id}`,
  balances: (year?: number) => year ? `/day-off/balances?year=${year}` : '/day-off/balances',
  applications: (params?: { status?: string; year?: number; scope?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.year) sp.append('year', params.year.toString());
    if (params?.scope) sp.append('scope', params.scope);
    const qs = sp.toString();
    return qs ? `/day-off/applications?${qs}` : '/day-off/applications';
  },
  myApplications: (year?: number) => year ? `/day-off/applications/my?year=${year}` : '/day-off/applications/my',
  apply: '/day-off/applications',
  cancel: (id: string) => `/day-off/applications/${id}/cancel`,
  updateStatus: (id: string) => `/day-off/applications/${id}/status`,
  notifications: '/notifications',
  markNotificationRead: (id: string) => `/notifications/${id}/read`,
  markAllNotificationsRead: '/notifications/read-all',
};

export const fetchDayOffSettings = async () => {
  const res = await api.get(dayOffEndpoints.settings);
  return res.data;
};

export const updateDayOffSettings = async (data: any) => {
  const res = await api.patch(dayOffEndpoints.settings, data);
  return res.data;
};

export const fetchLeaveTypes = async (activeOnly?: boolean) => {
  const res = await api.get(dayOffEndpoints.leaveTypes(activeOnly));
  return res.data;
};

export const fetchLeaveTypeById = async (id: string) => {
  const res = await api.get(dayOffEndpoints.leaveType(id));
  return res.data;
};

export const createLeaveType = async (data: any) => {
  const res = await api.post('/day-off/leave-types', data);
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

export const fetchMyLeaveBalances = async (year?: number) => {
  const res = await api.get(dayOffEndpoints.balances(year));
  return res.data;
};

export const fetchMyLeaveApplications = async (year?: number) => {
  const res = await api.get(dayOffEndpoints.myApplications(year));
  return res.data;
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

export const updateDayOffStatus = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
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






