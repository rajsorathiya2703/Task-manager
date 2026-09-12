export interface TimeEntry {
  _id?: string;
  user: {
    name: string;
    avatarUrl?: string;
    email?: string;
  };
  startTime: string | Date;
  stopTime: string | Date;
  durationSeconds: number;
}

export interface Task {
  id: string;
  _id?: string;
  title: string;
  assignee?: {
    _id?: string;
    name?: string;
    fullName?: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
    };
    avatarUrl?: string;
    email?: string;
  };
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  priority: "High" | "Medium" | "Low" | "No Priority";
  status?: string;
  description?: string;
  estimatedHours?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: string | Date;
  timerUser?: {
    name: string;
    avatarUrl?: string;
    email?: string;
  };
  members?: { email: string; name?: string; status: 'invited' | 'joined' }[];
  resources?: { name: string; url: string; type: 'link' | 'file' }[];
  projectId?: string;
  project?: {
    name: string;
    color?: string;
  };
  isOwner?: boolean;
  comments?: {
    _id: string;
    user: { name: string; avatarUrl?: string };
    content: string;
    mentions?: string[];
    attachments?: { name: string; url: string; type: 'link' | 'file' }[];
    createdAt: string;
    updatedAt: string;
  }[];
  updates?: {
    _id?: string;
    user: { name: string; avatarUrl?: string; email?: string };
    type: string;
    message: string;
    timestamp: string | Date;
  }[];
  timeEntries?: TimeEntry[];
}


export interface Project {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  color?: string;
  userId?: string;
  teamId?: any;
  members?: { email: string; name?: string; status: 'invited' | 'joined' }[];
  createdAt?: string;
  updatedAt?: string;
}


