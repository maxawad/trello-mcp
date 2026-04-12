import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../db";

interface SeedTask {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  assigned_to?: string | null;
}

interface SeedProject {
  project: {
    id: string;
    name: string;
    description: string;
    color: string;
  };
  tasks: SeedTask[];
}

const SEED_PROJECTS: SeedProject[] = [
  {
    project: {
      id: "web-app",
      name: "Web App Redesign",
      description: "Redesign the main web application with a modern UI",
      color: "#3b82f6",
    },
    tasks: [
      { id: "wa-1", title: "Design system & component library", description: "Build reusable UI components with Tailwind", status: "done", start_date: "2026-01-15", end_date: "2026-02-28", tags: ["design", "frontend"], assigned_to: "designer" },
      { id: "wa-2", title: "Implement authentication flow", description: "Login, register, password reset pages", status: "in_progress", start_date: "2026-03-01", end_date: "2026-03-31", tags: ["auth", "backend"], assigned_to: "backend" },
      { id: "wa-3", title: "Dashboard page", description: "Main dashboard with charts and metrics", status: "in_progress", start_date: "2026-03-15", end_date: "2026-04-15", tags: ["frontend"], assigned_to: "frontend" },
      { id: "wa-4", title: "API rate limiting & caching", description: "Add Redis caching and rate limit middleware", status: "todo", start_date: "2026-04-01", end_date: "2026-04-30", tags: ["backend", "infra"], assigned_to: "backend" },
      { id: "wa-5", title: "E2E test suite", description: "Playwright tests for critical user flows", status: "backlog", start_date: null, end_date: null, tags: ["testing"], assigned_to: "qa" },
      { id: "wa-6", title: "CI/CD pipeline", description: "GitHub Actions for build, test, deploy", status: "todo", start_date: "2026-04-15", end_date: "2026-05-01", tags: ["devops"], assigned_to: "devops" },
    ],
  },
  {
    project: {
      id: "mobile-app",
      name: "Mobile App v2",
      description: "Native mobile app for iOS and Android",
      color: "#8b5cf6",
    },
    tasks: [
      { id: "ma-1", title: "Setup React Native project", description: "Initialize project with Expo and configure navigation", status: "done", start_date: "2026-02-01", end_date: "2026-02-15", tags: ["mobile", "setup"] },
      { id: "ma-2", title: "Offline data sync", description: "SQLite local storage with background sync", status: "in_progress", start_date: "2026-03-01", end_date: "2026-04-15", tags: ["mobile", "data"], assigned_to: "backend" },
      { id: "ma-3", title: "Push notifications", description: "APNs and FCM integration", status: "todo", start_date: null, end_date: null, tags: ["mobile", "notifications"] },
      { id: "ma-4", title: "App Store submission", description: "Screenshots, descriptions, review guidelines", status: "backlog", start_date: null, end_date: null, tags: ["release"], assigned_to: "pm" },
    ],
  },
  {
    project: {
      id: "infra",
      name: "Infrastructure",
      description: "Cloud infrastructure and monitoring improvements",
      color: "#10b981",
    },
    tasks: [
      { id: "inf-1", title: "Migrate to Kubernetes", description: "Move from Docker Compose to K8s on GKE", status: "in_progress", start_date: "2026-02-15", end_date: "2026-05-01", tags: ["k8s", "migration"], assigned_to: "devops" },
      { id: "inf-2", title: "Set up monitoring & alerting", description: "Grafana dashboards, PagerDuty alerts", status: "todo", start_date: null, end_date: null, tags: ["monitoring"], assigned_to: "devops" },
      { id: "inf-3", title: "Database backup automation", description: "Automated daily backups with point-in-time recovery", status: "backlog", start_date: null, end_date: null, tags: ["database", "reliability"] },
    ],
  },
];

export async function POST() {
  await ensureSchema();

  for (const seed of SEED_PROJECTS) {
    await sql`
      INSERT INTO projects (id, name, description, color)
      VALUES (${seed.project.id}, ${seed.project.name}, ${seed.project.description}, ${seed.project.color})
      ON CONFLICT (id) DO NOTHING
    `;

    for (let i = 0; i < seed.tasks.length; i++) {
      const t = seed.tasks[i];
      await sql`
        INSERT INTO tasks (id, project_id, title, description, status, start_date, end_date, tags, position, assigned_to)
        VALUES (
          ${t.id}, ${seed.project.id}, ${t.title}, ${t.description},
          ${t.status}, ${t.start_date}, ${t.end_date}, ${t.tags}, ${i},
          ${t.assigned_to || null}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  return NextResponse.json({
    message: "Seeded defaults successfully",
    projects: SEED_PROJECTS.length,
    tasks: SEED_PROJECTS.reduce((sum, p) => sum + p.tasks.length, 0),
  });
}
