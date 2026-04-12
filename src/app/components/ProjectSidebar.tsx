"use client";

import { useState } from "react";
import type { Project, Agent } from "./types";
import { getAgent } from "../data/agents";

interface ProjectSidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
}

function projectAgents(project: Project): Agent[] {
  const ids = new Set(project.tasks.map((t) => t.assignedTo).filter(Boolean));
  return [...ids].map((id) => getAgent(id!)).filter(Boolean) as Agent[];
}

const PROJECT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export default function ProjectSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  onRenameProject,
}: ProjectSidebarProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function handleAdd() {
    if (!newName.trim()) return;
    const color =
      PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    onAddProject({
      id: `proj-${Date.now()}`,
      name: newName.trim(),
      description: "",
      color,
      tasks: [],
    });
    setNewName("");
    setAdding(false);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-sm font-bold tracking-tight">Projects</h1>
      </div>

      <div className="px-2 pt-2">
        {adding ? (
          <div className="flex gap-1 mb-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="flex-1 min-w-0 bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] px-2 py-1.5 rounded-md outline-none border border-[var(--border)] focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                }
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors mb-1"
          >
            + New project
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 pt-0 space-y-0.5">
        {projects.map((project) => (
          <div key={project.id} className="group relative">
            {renamingId === project.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] px-3 py-2 rounded-lg outline-none border border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setRenamingId(null);
                    setRenameValue("");
                  }
                }}
              />
            ) : (
              <button
                onClick={() => onSelectProject(project.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setRenamingId(project.id);
                  setRenameValue(project.name);
                }}
                className={`w-full text-left flex flex-col gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeProjectId === project.id
                    ? "bg-[var(--accent)]/15 text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-2.5 w-full">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                    {project.tasks.length}
                  </span>
                </div>
                {projectAgents(project).length > 0 && (
                  <div className="flex items-center gap-0.5 ml-4">
                    {projectAgents(project).slice(0, 4).map((agent) => (
                      <div
                        key={agent.id}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white -ml-0.5 first:ml-0 ring-1 ring-[var(--bg-secondary)]"
                        style={{ backgroundColor: agent.color }}
                        title={`${agent.name} — ${agent.title}`}
                      >
                        {agent.initials}
                      </div>
                    ))}
                    {projectAgents(project).length > 4 && (
                      <span className="text-[9px] text-[var(--text-muted)] ml-1">
                        +{projectAgents(project).length - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )}
            {projects.length > 1 && renamingId !== project.id && (
              <button
                onClick={() => onDeleteProject(project.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity text-xs px-1"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </nav>

    </aside>
  );
}
