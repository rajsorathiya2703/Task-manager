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

    if (error.response?.status === 403) {
      const message = error.response?.data?.message || 'Access Denied: You do not have permission to perform this action.';
      console.warn('[403 Forbidden]', message);
      if (accessDeniedHandler) {
        accessDeniedHandler(message);
      }
    }

    return Promise.reject(error);
  }
);

let accessDeniedHandler: ((message: string) => void) | null = null;

export const setAccessDeniedHandler = (handler: ((message: string) => void) | null) => {
  accessDeniedHandler = handler;
};

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

// User Groups
export const userGroupEndpoints = {
  getAll: '/user-groups',
  getOne: (id: any) => `/user-groups/${toId(id)}`,
  create: '/user-groups',
  update: (id: any) => `/user-groups/${toId(id)}`,
  delete: (id: any) => `/user-groups/${toId(id)}`,
};

export const fetchUserGroups = async () => {
  const res = await api.get(userGroupEndpoints.getAll);
  return res.data;
};

export const fetchUserGroupById = async (id: string) => {
  const res = await api.get(userGroupEndpoints.getOne(id));
  return res.data;
};

export const createUserGroup = async (data: any) => {
  const res = await api.post(userGroupEndpoints.create, data);
  return res.data;
};

export const updateUserGroup = async (id: string, data: any) => {
  const res = await api.patch(userGroupEndpoints.update(id), data);
  return res.data;
};

export const deleteUserGroup = async (id: string) => {
  const res = await api.delete(userGroupEndpoints.delete(id));
  return res.data;
};

export const fetchMyPermissions = async () => {
  const res = await api.get('/user-groups/my-permissions');
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




