"use client";

import { useState, useRef } from "react";
import type { Project, Task, TaskStatus, Agent } from "./types";
import { STATUS_LABELS, STATUS_COLORS } from "./types";

const COLUMNS: TaskStatus[] = ["backlog", "todo", "in_progress", "done"];

interface KanbanBoardProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  agents?: Agent[];
}

export default function KanbanBoard({
  project,
  onUpdateProject,
  agents = [],
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const [assigningTask, setAssigningTask] = useState<string | null>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);
  const agentsById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const tasksByStatus = COLUMNS.reduce(
    (acc, status) => {
      acc[status] = project.tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  function handleDragStart(taskId: string) {
    setDraggedTask(taskId);
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setDragOverColumn(status);
  }

  function handleDrop(status: TaskStatus) {
    if (!draggedTask) return;
    const updated = project.tasks.map((t) =>
      t.id === draggedTask ? { ...t, status } : t
    );
    onUpdateProject({ ...project, tasks: updated });
    setDraggedTask(null);
    setDragOverColumn(null);
  }

  function handleDragEnd() {
    setDraggedTask(null);
    setDragOverColumn(null);
  }

  function addTask(status: TaskStatus, title: string) {
    if (!title.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      status,
    };
    onUpdateProject({ ...project, tasks: [...project.tasks, task] });
    setAddingTo(null);
  }

  function deleteTask(taskId: string) {
    onUpdateProject({
      ...project,
      tasks: project.tasks.filter((t) => t.id !== taskId),
    });
  }

  function updateTaskTitle(taskId: string, title: string) {
    onUpdateProject({
      ...project,
      tasks: project.tasks.map((t) =>
        t.id === taskId ? { ...t, title } : t
      ),
    });
    setEditingTask(null);
  }

  function assignAgent(taskId: string, agentId: string | null) {
    onUpdateProject({
      ...project,
      tasks: project.tasks.map((t) =>
        t.id === taskId ? { ...t, assignedTo: agentId || undefined } : t
      ),
    });
    setAssigningTask(null);
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto p-6">
      {COLUMNS.map((status) => (
        <div
          key={status}
          className="flex flex-col min-w-[280px] w-[280px] shrink-0"
          onDragOver={(e) => handleDragOver(e, status)}
          onDrop={() => handleDrop(status)}
          onDragLeave={() => setDragOverColumn(null)}
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--text-secondary)]">
              {STATUS_LABELS[status]}
            </h3>
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              {tasksByStatus[status].length}
            </span>
          </div>

          <div
            className={`flex-1 rounded-xl p-2 space-y-2 transition-colors duration-150 ${
              dragOverColumn === status
                ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30"
                : "bg-[var(--bg-secondary)] border border-transparent"
            }`}
          >
            {tasksByStatus[status].map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onDragEnd={handleDragEnd}
                className={`group rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-150 border ${
                  draggedTask === task.id
                    ? "opacity-40 scale-95"
                    : "opacity-100"
                } bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-lg`}
              >
                {editingTask === task.id ? (
                  <input
                    autoFocus
                    defaultValue={task.title}
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                    onBlur={(e) => updateTaskTitle(task.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        updateTaskTitle(
                          task.id,
                          (e.target as HTMLInputElement).value
                        );
                      if (e.key === "Escape") setEditingTask(null);
                    }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-sm text-[var(--text-primary)] leading-snug cursor-text"
                      onClick={() => setEditingTask(task.id)}
                    >
                      {task.title}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity text-xs shrink-0 mt-0.5"
                    >
                      &times;
                    </button>
                  </div>
                )}
                {task.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    {task.description}
                  </p>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 relative">
                  {task.assignedTo && agentsById[task.assignedTo] ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssigningTask(assigningTask === task.id ? null : task.id); }}
                      className="flex items-center gap-1.5 group/agent"
                      title={`${agentsById[task.assignedTo].name} — ${agentsById[task.assignedTo].title}`}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: agentsById[task.assignedTo].color }}
                      >
                        {agentsById[task.assignedTo].initials}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] group-hover/agent:text-[var(--text-secondary)] transition-colors truncate max-w-[120px]">
                        {agentsById[task.assignedTo].name}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssigningTask(assigningTask === task.id ? null : task.id); }}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      + Assign
                    </button>
                  )}
                  {assigningTask === task.id && (
                    <div className="absolute bottom-full left-0 mb-1 z-20 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-1 w-56 max-h-52 overflow-y-auto">
                      <button
                        onClick={() => assignAgent(task.id, null)}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        Unassign
                      </button>
                      {agents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => assignAgent(task.id, agent.id)}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2 ${
                            task.assignedTo === agent.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ backgroundColor: agent.color }}
                          >
                            {agent.initials}
                          </div>
                          <span className="truncate">{agent.name}</span>
                          <span className="text-[var(--text-muted)] ml-auto shrink-0 text-[10px]">{agent.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {addingTo === status ? (
              <div className="rounded-lg p-2 bg-[var(--bg-card)] border border-[var(--border)]">
                <input
                  ref={newTaskRef}
                  autoFocus
                  placeholder="Task title..."
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      addTask(status, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setAddingTo(null);
                  }}
                  onBlur={(e) => {
                    if (e.target.value.trim()) addTask(status, e.target.value);
                    else setAddingTo(null);
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(status)}
                className="w-full text-left text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
              >
                + Add task
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
