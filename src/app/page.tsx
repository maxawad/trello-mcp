"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, Task } from "./components/types";
import ProjectSidebar from "./components/ProjectSidebar";
import KanbanBoard from "./components/KanbanBoard";
import Timeline from "./components/Timeline";
import ChatPanel from "./components/ChatPanel";
import { useRealtimeVoice } from "./hooks/useRealtimeVoice";
import { AGENTS } from "./data/agents";

type View = "kanban" | "timeline";

interface DBProject {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    tags: string[];
    assignedTo: string | null;
    parentTaskId: string | null;
  }>;
}

function normalizeProject(p: DBProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    color: p.color,
    tasks: (p.tasks || []).map(
      (t): Task => ({
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        status: t.status as Task["status"],
        startDate: t.startDate || undefined,
        endDate: t.endDate || undefined,
        tags: t.tags || [],
        assignedTo: t.assignedTo || undefined,
        parentTaskId: t.parentTaskId || undefined,
      })
    ),
  };
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [view, setView] = useState<View>("kanban");
  const [loaded, setLoaded] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleUpdateProject = useCallback(
    (updated: Project) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    },
    []
  );

  const voice = useRealtimeVoice({
    project: activeProject || { id: "", name: "", description: "", color: "", tasks: [] },
    onProjectUpdate: handleUpdateProject,
  });

  useEffect(() => {
    async function load() {
      try {
        await fetch("/api/seed", { method: "POST" });
        const res = await fetch("/api/projects");
        const data: DBProject[] = await res.json();
        const normalized = data.map(normalizeProject);
        setProjects(normalized);
        setActiveProjectId(normalized[0]?.id ?? "");
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (voice.isConnected && activeProject) {
      voice.refreshDigest();
    }
  }, [activeProject?.tasks]);

  async function handleAddProject(project: Project) {
    setProjects((prev) => [...prev, project]);
    setActiveProjectId(project.id);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
      }),
    });
  }

  async function handleDeleteProject(id: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeProjectId === id && next.length > 0) {
        setActiveProjectId(next[0].id);
      }
      return next;
    });
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  }

  async function handleRenameProject(id: string, name: string) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  function handleUpdateProjectWithSync(updated: Project) {
    const previous = projects.find((p) => p.id === updated.id);
    handleUpdateProject(updated);

    if (!previous) return;

    const prevTaskIds = new Set(previous.tasks.map((t) => t.id));
    const newTaskIds = new Set(updated.tasks.map((t) => t.id));

    for (const task of updated.tasks) {
      if (!prevTaskIds.has(task.id)) {
        fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: task.id,
            project_id: updated.id,
            title: task.title,
            description: task.description || "",
            status: task.status,
            start_date: task.startDate || null,
            end_date: task.endDate || null,
            tags: task.tags || [],
            assigned_to: task.assignedTo || null,
          }),
        });
      } else {
        const prevTask = previous.tasks.find((t) => t.id === task.id);
        if (prevTask && JSON.stringify(prevTask) !== JSON.stringify(task)) {
          fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: task.title,
              description: task.description || "",
              status: task.status,
              start_date: task.startDate || null,
              end_date: task.endDate || null,
              tags: task.tags || [],
              assigned_to: task.assignedTo || null,
            }),
          });
        }
      }
    }

    for (const id of prevTaskIds) {
      if (!newTaskIds.has(id)) {
        fetch(`/api/tasks/${id}`, { method: "DELETE" });
      }
    }
  }

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <ProjectSidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {activeProject ? (
          <>
            <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeProject.color }}
                />
                <h2 className="text-lg font-semibold tracking-tight">
                  {activeProject.name}
                </h2>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                  {activeProject.tasks.length} tasks
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border)]">
                  <button
                    onClick={() => setView("kanban")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      view === "kanban"
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Kanban
                  </button>
                  <button
                    onClick={() => setView("timeline")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      view === "timeline"
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Timeline
                  </button>
                </div>
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`px-2 py-1.5 text-xs rounded-md transition-colors border ${
                    chatOpen
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                  title="Toggle agent panel"
                >
                  ⌘
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden">
              {view === "kanban" ? (
                <KanbanBoard
                  project={activeProject}
                  onUpdateProject={handleUpdateProjectWithSync}
                  agents={AGENTS}
                />
              ) : (
                <Timeline
                  project={activeProject}
                  onUpdateProject={handleUpdateProjectWithSync}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[var(--text-muted)] text-sm">
              Create a project to get started
            </p>
          </div>
        )}
      </main>

      {chatOpen && activeProject && (
        <ChatPanel
          project={activeProject}
          messages={voice.messages}
          isConnected={voice.isConnected}
          isConnecting={voice.isConnecting}
          isAISpeaking={voice.isAISpeaking}
          inputLevel={voice.inputLevel}
          onConnect={voice.connect}
          onDisconnect={voice.disconnect}
          onSendText={voice.sendText}
        />
      )}
    </div>
  );
}
