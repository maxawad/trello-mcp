"use client";

import { useMemo } from "react";
import type { Project, Task, TaskStatus } from "./types";
import { STATUS_COLORS, STATUS_LABELS } from "./types";

interface TimelineProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const DAY_WIDTH = 40;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 60;

function parseDate(d: string) {
  return new Date(d + "T00:00:00");
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

const STATUS_ORDER: TaskStatus[] = ["in_progress", "todo", "backlog", "done"];

export default function Timeline({ project, onUpdateProject }: TimelineProps) {
  const { timelineStart, timelineEnd, totalDays, tasks, months, weeks } =
    useMemo(() => {
      const tasksWithDates = project.tasks.filter(
        (t) => t.startDate && t.endDate
      );
      const tasksWithoutDates = project.tasks.filter(
        (t) => !t.startDate || !t.endDate
      );

      const sorted = [...tasksWithDates].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      );
      const all = [...sorted, ...tasksWithoutDates];

      const today = new Date();
      let earliest = new Date(today);
      let latest = addDays(today, 90);

      for (const t of tasksWithDates) {
        const s = parseDate(t.startDate!);
        const e = parseDate(t.endDate!);
        if (s < earliest) earliest = s;
        if (e > latest) latest = e;
      }

      const start = addDays(getMonday(earliest), -7);
      const end = addDays(latest, 14);
      const days = diffDays(start, end);

      const monthsList: { label: string; offset: number; width: number }[] = [];
      let cursor = new Date(start);
      while (cursor <= end) {
        const monthStart = new Date(cursor);
        const label = monthStart.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        const nextMonth = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth() + 1,
          1
        );
        const offset = diffDays(start, monthStart);
        const width = Math.min(diffDays(monthStart, nextMonth), days - offset);
        monthsList.push({ label, offset, width });
        cursor = nextMonth;
      }

      const weeksList: { offset: number; date: Date }[] = [];
      let weekCursor = getMonday(new Date(start));
      while (weekCursor <= end) {
        const offset = diffDays(start, weekCursor);
        if (offset >= 0) weeksList.push({ offset, date: new Date(weekCursor) });
        weekCursor = addDays(weekCursor, 7);
      }

      return {
        timelineStart: start,
        timelineEnd: end,
        totalDays: days,
        tasks: all,
        months: monthsList,
        weeks: weeksList,
      };
    }, [project.tasks]);

  const todayOffset = diffDays(timelineStart, new Date());

  function handleBarDrag(
    task: Task,
    e: React.MouseEvent,
    edge: "move" | "start" | "end"
  ) {
    if (!task.startDate || !task.endDate) return;
    e.preventDefault();

    const startX = e.clientX;
    const origStart = parseDate(task.startDate);
    const origEnd = parseDate(task.endDate);

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dayDelta = Math.round(dx / DAY_WIDTH);
      if (dayDelta === 0) return;

      let newStart = origStart;
      let newEnd = origEnd;

      if (edge === "move") {
        newStart = addDays(origStart, dayDelta);
        newEnd = addDays(origEnd, dayDelta);
      } else if (edge === "start") {
        newStart = addDays(origStart, dayDelta);
        if (newStart >= newEnd) return;
      } else {
        newEnd = addDays(origEnd, dayDelta);
        if (newEnd <= newStart) return;
      }

      onUpdateProject({
        ...project,
        tasks: project.tasks.map((t) =>
          t.id === task.id
            ? { ...t, startDate: formatDate(newStart), endDate: formatDate(newEnd) }
            : t
        ),
      });
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function assignDates(task: Task) {
    const today = new Date();
    const start = formatDate(today);
    const end = formatDate(addDays(today, 14));
    onUpdateProject({
      ...project,
      tasks: project.tasks.map((t) =>
        t.id === task.id ? { ...t, startDate: start, endDate: end } : t
      ),
    });
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div
        className="relative"
        style={{
          width: totalDays * DAY_WIDTH,
          minWidth: "100%",
        }}
      >
        <div
          className="flex sticky top-0 z-20 bg-[var(--bg-primary)]"
          style={{ height: HEADER_HEIGHT / 2 }}
        >
          {months.map((m, i) => (
            <div
              key={i}
              className="text-xs font-semibold text-[var(--text-secondary)] border-b border-r border-[var(--border)] flex items-center px-2"
              style={{
                position: "absolute",
                left: m.offset * DAY_WIDTH,
                width: m.width * DAY_WIDTH,
                height: HEADER_HEIGHT / 2,
              }}
            >
              {m.label}
            </div>
          ))}
        </div>

        <div
          className="flex sticky z-10 bg-[var(--bg-primary)]"
          style={{ top: HEADER_HEIGHT / 2, height: HEADER_HEIGHT / 2 }}
        >
          {weeks.map((w, i) => (
            <div
              key={i}
              className="text-[10px] text-[var(--text-muted)] border-b border-r border-[var(--border)] flex items-center px-1"
              style={{
                position: "absolute",
                left: w.offset * DAY_WIDTH,
                width: 7 * DAY_WIDTH,
                height: HEADER_HEIGHT / 2,
              }}
            >
              {w.date.toLocaleDateString("default", {
                month: "short",
                day: "numeric",
              })}
            </div>
          ))}
        </div>

        <div
          className="relative"
          style={{
            height: tasks.length * ROW_HEIGHT,
            width: totalDays * DAY_WIDTH,
          }}
        >
          {weeks.map((w, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-[var(--border)]"
              style={{ left: w.offset * DAY_WIDTH }}
            />
          ))}

          {todayOffset >= 0 && todayOffset <= totalDays && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)] z-10"
              style={{ left: todayOffset * DAY_WIDTH }}
            >
              <div className="absolute -top-5 -translate-x-1/2 text-[9px] font-semibold text-[var(--accent)] whitespace-nowrap">
                Today
              </div>
            </div>
          )}

          {tasks.map((_, i) => (
            <div
              key={i}
              className={`absolute w-full border-b border-[var(--border)] ${
                i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-secondary)]/30"
              }`}
              style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
            />
          ))}

          {tasks.map((task, i) => {
            if (!task.startDate || !task.endDate) {
              return (
                <div
                  key={task.id}
                  className="absolute flex items-center gap-2 px-2"
                  style={{
                    top: i * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                    left: 16,
                  }}
                >
                  <span className="text-xs text-[var(--text-muted)]">
                    {task.title}
                  </span>
                  <button
                    onClick={() => assignDates(task)}
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    + assign dates
                  </button>
                </div>
              );
            }

            const startOffset = diffDays(timelineStart, parseDate(task.startDate));
            const duration = diffDays(
              parseDate(task.startDate),
              parseDate(task.endDate)
            );
            const barLeft = startOffset * DAY_WIDTH;
            const barWidth = Math.max(duration * DAY_WIDTH, DAY_WIDTH);

            return (
              <div
                key={task.id}
                className="absolute flex items-center"
                style={{
                  top: i * ROW_HEIGHT + 6,
                  left: barLeft,
                  width: barWidth,
                  height: ROW_HEIGHT - 12,
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/10 rounded-l-md"
                  onMouseDown={(e) => handleBarDrag(task, e, "start")}
                />

                <div
                  className="w-full h-full rounded-md cursor-grab active:cursor-grabbing flex items-center px-2 overflow-hidden"
                  style={{
                    backgroundColor: STATUS_COLORS[task.status] + "33",
                    borderLeft: `3px solid ${STATUS_COLORS[task.status]}`,
                  }}
                  onMouseDown={(e) => handleBarDrag(task, e, "move")}
                >
                  <span className="text-xs text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis">
                    {task.title}
                  </span>
                </div>

                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/10 rounded-r-md"
                  onMouseDown={(e) => handleBarDrag(task, e, "end")}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 mt-6 pt-4 border-t border-[var(--border)]">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <span className="text-xs text-[var(--text-muted)]">
              {STATUS_LABELS[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
