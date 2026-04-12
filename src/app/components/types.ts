export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  assignedTo?: string;
  parentTaskId?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: Task[];
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  model: string;
  server: string;
  initials: string;
  color: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "#6b7280",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  done: "#10b981",
};
