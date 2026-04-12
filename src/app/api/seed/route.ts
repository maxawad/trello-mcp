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
      { id: "wa-1", title: "Design new landing page mockups", description: "Create Figma mockups for the new landing page", status: "done", start_date: "2026-03-01", end_date: "2026-03-15", tags: ["design"], assigned_to: "designer" },
      { id: "wa-2", title: "Implement responsive navigation", description: "Build mobile-first nav with hamburger menu", status: "in_progress", start_date: "2026-03-16", end_date: "2026-04-01", tags: ["frontend"], assigned_to: "frontend" },
      { id: "wa-3", title: "Set up CI/CD pipeline", description: "GitHub Actions for automated testing and deployment", status: "done", start_date: "2026-03-01", end_date: "2026-03-10", tags: ["devops"], assigned_to: "devops" },
      { id: "wa-4", title: "API rate limiting middleware", description: "Add rate limiting to all public endpoints", status: "todo", start_date: "2026-04-01", end_date: "2026-04-15", tags: ["backend", "security"], assigned_to: "backend" },
      { id: "wa-5", title: "Write E2E tests for auth flow", description: "Playwright tests for login, signup, password reset", status: "todo", start_date: null, end_date: null, tags: ["testing"], assigned_to: "qa" },
      { id: "wa-6", title: "Dark mode support", description: "Add dark mode toggle with system preference detection", status: "backlog", start_date: null, end_date: null, tags: ["frontend", "design"] },
      { id: "wa-7", title: "Performance audit", description: "Lighthouse audit and Core Web Vitals optimization", status: "backlog", start_date: null, end_date: null, tags: ["frontend", "performance"] },
    ],
  },
  {
    project: {
      id: "mobile-app",
      name: "Mobile App v2",
      description: "Native mobile app with offline support and push notifications",
      color: "#8b5cf6",
    },
    tasks: [
      { id: "ma-1", title: "Offline data sync engine", description: "SQLite local cache with conflict resolution", status: "in_progress", start_date: "2026-03-15", end_date: "2026-04-30", tags: ["mobile", "backend"], assigned_to: "backend" },
      { id: "ma-2", title: "Push notification service", description: "APNs and FCM integration for real-time alerts", status: "todo", start_date: null, end_date: null, tags: ["mobile", "backend"] },
      { id: "ma-3", title: "Biometric authentication", description: "Face ID / Touch ID login support", status: "todo", start_date: null, end_date: null, tags: ["mobile", "security"] },
      { id: "ma-4", title: "App Store submission prep", description: "Screenshots, descriptions, review guidelines", status: "backlog", start_date: null, end_date: null, tags: ["release"], assigned_to: "pm" },
    ],
  },
  {
    project: {
      id: "infra",
      name: "Infrastructure",
      description: "Cloud infrastructure, monitoring, and DevOps improvements",
      color: "#10b981",
    },
    tasks: [
      { id: "inf-1", title: "Migrate to Kubernetes", description: "Move from Docker Compose to K8s for production", status: "in_progress", start_date: "2026-03-01", end_date: "2026-05-01", tags: ["devops", "infra"], assigned_to: "devops" },
      { id: "inf-2", title: "Set up monitoring dashboard", description: "Grafana + Prometheus for system metrics", status: "todo", start_date: null, end_date: null, tags: ["monitoring"] },
      { id: "inf-3", title: "Automated database backups", description: "Daily Postgres snapshots with 30-day retention", status: "done", start_date: "2026-02-15", end_date: "2026-03-01", tags: ["database", "devops"], assigned_to: "devops" },
      { id: "inf-4", title: "Cost optimization review", description: "Audit cloud spend and right-size instances", status: "backlog", start_date: null, end_date: null, tags: ["infra", "cost"] },
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
