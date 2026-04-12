import type { Project, TaskStatus } from "./types";
import { STATUS_LABELS } from "./types";
import { getAgent } from "../data/agents";

const ORDER: TaskStatus[] = ["in_progress", "todo", "backlog", "done"];

export function generateDigest(project: Project): string {
  const counts: Record<TaskStatus, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
  };

  for (const t of project.tasks) counts[t.status]++;

  const assignedAgents = new Set(
    project.tasks.map((t) => t.assignedTo).filter(Boolean)
  );

  const lines: string[] = [
    `Project: ${project.name}`,
    `Total: ${project.tasks.length} tasks | Done: ${counts.done} | In Progress: ${counts.in_progress} | To Do: ${counts.todo} | Backlog: ${counts.backlog}`,
  ];

  if (assignedAgents.size > 0) {
    const agentNames = [...assignedAgents]
      .map((id) => {
        const a = getAgent(id!);
        return a ? `${a.name} (${a.id})` : id;
      })
      .join(", ");
    lines.push(`Team: ${agentNames}`);
  }

  lines.push("");

  for (const status of ORDER) {
    const tasks = project.tasks.filter((t) => t.status === status);
    if (tasks.length === 0) continue;

    lines.push(`${STATUS_LABELS[status].toUpperCase()}:`);
    for (const t of tasks) {
      let line = `- ${t.title} (${t.id})`;
      if (t.assignedTo) {
        const a = getAgent(t.assignedTo);
        line += ` @${a ? a.name : t.assignedTo}`;
      }
      if (t.startDate && t.endDate) line += ` (${t.startDate} – ${t.endDate})`;
      if (t.tags && t.tags.length > 0) line += ` [${t.tags.join(", ")}]`;
      if (t.description) line += ` — ${t.description}`;
      lines.push(line);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
