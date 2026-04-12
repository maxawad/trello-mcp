import type { Project, Task, TaskStatus } from "./types";
import { STATUS_LABELS } from "./types";
import { generateDigest } from "./digest";
import { AGENTS, getAgent } from "../data/agents";

export interface ToolDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    name: "move_task",
    description:
      "Move a task to a different Kanban column (status). Valid statuses: backlog, todo, in_progress, done.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID (e.g. pv-7) or title (e.g. 'Publish to MCP registries')" },
        new_status: {
          type: "string",
          enum: ["backlog", "todo", "in_progress", "done"],
          description: "The target status column",
        },
      },
      required: ["task_id", "new_status"],
    },
  },
  {
    type: "function",
    name: "edit_task",
    description: "Update fields on an existing task.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID (e.g. pv-7) or title" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "New tags array",
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: ["task_id"],
    },
  },
  {
    type: "function",
    name: "add_task",
    description: "Create a new task in the active project.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        status: {
          type: "string",
          enum: ["backlog", "todo", "in_progress", "done"],
          description: "Initial status (defaults to todo)",
        },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        start_date: { type: "string" },
        end_date: { type: "string" },
        assigned_to: {
          type: "string",
          description: `Agent ID to assign. Available agents: ${AGENTS.map((a) => `${a.id} (${a.name})`).join(", ")}`,
        },
      },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "assign_task",
    description: `Assign or reassign a task to an agent. Available agents: ${AGENTS.map((a) => `${a.id} (${a.name}, ${a.title})`).join(", ")}. Use agent_id "none" to unassign.`,
    parameters: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID or title",
        },
        agent_id: {
          type: "string",
          description: `Agent ID to assign, or "none" to unassign`,
        },
      },
      required: ["task_id", "agent_id"],
    },
  },
  {
    type: "function",
    name: "list_agents",
    description: "List all available agents that can be assigned to tasks.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "delete_task",
    description: "Delete a task by its ID.",
    parameters: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The task ID (e.g. pv-7) or title",
        },
      },
      required: ["task_id"],
    },
  },
  {
    type: "function",
    name: "list_tasks",
    description:
      "List tasks in the active project, optionally filtered by status.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["backlog", "todo", "in_progress", "done"],
          description: "Filter by status (omit for all tasks)",
        },
      },
    },
  },
  {
    type: "function",
    name: "get_project_summary",
    description:
      "Get a full text digest/summary of the active project and all its tasks.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "submit_feedback",
    description:
      "Save user feedback or feature suggestions about the app's UI, UX, or functionality. Use whenever the user mentions something they'd like changed, improved, or added.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title summarizing the feedback",
        },
        body: {
          type: "string",
          description:
            "Detailed description of the feedback, suggestion, or bug report",
        },
        category: {
          type: "string",
          enum: ["ui", "ux", "feature", "bug", "other"],
          description: "Category of the feedback",
        },
      },
      required: ["title", "body"],
    },
  },
];

export interface ToolCallResult {
  output: string;
  updatedProject?: Project;
}

function findTask(tasks: Task[], taskId: string): Task | undefined {
  const exact = tasks.find((t) => t.id === taskId);
  if (exact) return exact;

  const lower = taskId.toLowerCase();
  const byTitle = tasks.filter(
    (t) => t.title.toLowerCase() === lower
  );
  if (byTitle.length === 1) return byTitle[0];

  const byPartial = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      lower.includes(t.title.toLowerCase())
  );
  if (byPartial.length === 1) return byPartial[0];

  const byWords = lower.split(/\s+/);
  const byFuzzy = tasks.filter((t) => {
    const title = t.title.toLowerCase();
    return byWords.every((w) => title.includes(w));
  });
  if (byFuzzy.length === 1) return byFuzzy[0];

  return undefined;
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  project: Project
): ToolCallResult {
  switch (name) {
    case "move_task": {
      const taskId = args.task_id as string;
      const newStatus = args.new_status as TaskStatus;
      const task = findTask(project.tasks, taskId);
      if (!task)
        return { output: `Task "${taskId}" not found in this project.` };

      const oldStatus = task.status;
      const updatedProject = {
        ...project,
        tasks: project.tasks.map((t) =>
          t.id === task.id ? { ...t, status: newStatus } : t
        ),
      };

      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      return {
        output: `Moved "${task.title}" from ${STATUS_LABELS[oldStatus]} to ${STATUS_LABELS[newStatus]}.`,
        updatedProject,
      };
    }

    case "edit_task": {
      const taskId = args.task_id as string;
      const task = findTask(project.tasks, taskId);
      if (!task)
        return { output: `Task "${taskId}" not found in this project.` };

      const updates: Partial<Task> = {};
      const apiUpdates: Record<string, unknown> = {};

      if (args.title) {
        updates.title = args.title as string;
        apiUpdates.title = args.title;
      }
      if (args.description !== undefined) {
        updates.description = args.description as string;
        apiUpdates.description = args.description;
      }
      if (args.tags) {
        updates.tags = args.tags as string[];
        apiUpdates.tags = args.tags;
      }
      if (args.start_date) {
        updates.startDate = args.start_date as string;
        apiUpdates.start_date = args.start_date;
      }
      if (args.end_date) {
        updates.endDate = args.end_date as string;
        apiUpdates.end_date = args.end_date;
      }

      const updatedProject = {
        ...project,
        tasks: project.tasks.map((t) =>
          t.id === task.id ? { ...t, ...updates } : t
        ),
      };

      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiUpdates),
      });

      return {
        output: `Updated "${task.title}": ${Object.keys(updates).join(", ")} changed.`,
        updatedProject,
      };
    }

    case "add_task": {
      const assignedTo = args.assigned_to as string | undefined;
      const agent = assignedTo ? getAgent(assignedTo) : undefined;
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: args.title as string,
        status: (args.status as TaskStatus) || "todo",
        description: (args.description as string) || "",
        tags: (args.tags as string[]) || [],
        startDate: args.start_date as string | undefined,
        endDate: args.end_date as string | undefined,
        assignedTo: agent ? assignedTo : undefined,
      };

      const updatedProject = {
        ...project,
        tasks: [...project.tasks, newTask],
      };

      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTask.id,
          project_id: project.id,
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          start_date: newTask.startDate || null,
          end_date: newTask.endDate || null,
          tags: newTask.tags,
          assigned_to: newTask.assignedTo || null,
        }),
      });

      let output = `Created new task "${newTask.title}" in ${STATUS_LABELS[newTask.status]}.`;
      if (agent) output += ` Assigned to ${agent.name} (${agent.title}).`;

      return { output, updatedProject };
    }

    case "assign_task": {
      const taskId = args.task_id as string;
      const agentId = args.agent_id as string;
      const task = findTask(project.tasks, taskId);
      if (!task)
        return { output: `Task "${taskId}" not found in this project.` };

      const isUnassign = agentId === "none" || agentId === "";
      const agent = isUnassign ? undefined : getAgent(agentId);

      if (!isUnassign && !agent) {
        return {
          output: `Agent "${agentId}" not found. Available: ${AGENTS.map((a) => a.id).join(", ")}`,
        };
      }

      const updatedProject = {
        ...project,
        tasks: project.tasks.map((t) =>
          t.id === task.id
            ? { ...t, assignedTo: isUnassign ? undefined : agentId }
            : t
        ),
      };

      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: isUnassign ? null : agentId }),
      });

      return {
        output: isUnassign
          ? `Unassigned "${task.title}".`
          : `Assigned "${task.title}" to ${agent!.name} (${agent!.title}).`,
        updatedProject,
      };
    }

    case "list_agents": {
      const lines = AGENTS.map(
        (a) => `- ${a.id}: ${a.name} — ${a.title} (${a.server})`
      );
      return { output: `${AGENTS.length} agents:\n${lines.join("\n")}` };
    }

    case "delete_task": {
      const taskId = args.task_id as string;
      const task = findTask(project.tasks, taskId);
      if (!task)
        return { output: `Task "${taskId}" not found in this project.` };

      const updatedProject = {
        ...project,
        tasks: project.tasks.filter((t) => t.id !== task.id),
      };

      fetch(`/api/tasks/${task.id}`, { method: "DELETE" });

      return {
        output: `Deleted task "${task.title}".`,
        updatedProject,
      };
    }

    case "list_tasks": {
      const statusFilter = args.status as TaskStatus | undefined;
      const filtered = statusFilter
        ? project.tasks.filter((t) => t.status === statusFilter)
        : project.tasks;

      if (filtered.length === 0) {
        return {
          output: statusFilter
            ? `No tasks in ${STATUS_LABELS[statusFilter]}.`
            : "No tasks in this project.",
        };
      }

      const lines = filtered.map(
        (t) => `- [${t.status}] ${t.title} (${t.id})`
      );
      return {
        output: `${filtered.length} task(s):\n${lines.join("\n")}`,
      };
    }

    case "get_project_summary": {
      return { output: generateDigest(project) };
    }

    case "submit_feedback": {
      const title = args.title as string;
      const body = args.body as string;
      const category = (args.category as string) || "other";

      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });

      return {
        output: `Feedback saved: "${title}" [${category}]`,
      };
    }

    default:
      return { output: `Unknown tool: ${name}` };
  }
}
