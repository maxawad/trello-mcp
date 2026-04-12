import type { Agent } from "../components/types";

const AGENT_COLORS: Record<string, string> = {
  "frontend": "#3b82f6",
  "backend": "#10b981",
  "designer": "#8b5cf6",
  "devops": "#f59e0b",
  "qa": "#ef4444",
  "pm": "#ec4899",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const AGENTS: Agent[] = [
  { id: "frontend", name: "Alex Chen", title: "Frontend Engineer", model: "gpt-4o", server: "main" },
  { id: "backend", name: "Sam Rivera", title: "Backend Engineer", model: "gpt-4o", server: "main" },
  { id: "designer", name: "Jordan Park", title: "UI/UX Designer", model: "gpt-4o", server: "main" },
  { id: "devops", name: "Riley Santos", title: "DevOps Engineer", model: "gpt-4o", server: "main" },
  { id: "qa", name: "Casey Lee", title: "QA Engineer", model: "gpt-4o", server: "main" },
  { id: "pm", name: "Morgan Kim", title: "Project Manager", model: "gpt-4o", server: "main" },
].map((a) => ({
  ...a,
  initials: initials(a.name),
  color: AGENT_COLORS[a.id] || "#6b7280",
}));

export const AGENTS_BY_ID: Record<string, Agent> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
);

export function getAgent(id: string | undefined): Agent | undefined {
  if (!id) return undefined;
  return AGENTS_BY_ID[id];
}
