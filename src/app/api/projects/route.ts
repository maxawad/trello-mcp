import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../db";

export async function GET() {
  await ensureSchema();
  const projects = await sql`
    SELECT p.*,
      COALESCE(json_agg(
        json_build_object(
          'id', t.id,
          'title', t.title,
          'description', t.description,
          'status', t.status,
          'startDate', t.start_date,
          'endDate', t.end_date,
          'tags', t.tags,
          'parentTaskId', t.parent_task_id,
          'assignedTo', t.assigned_to
        ) ORDER BY t.position, t.created_at
      ) FILTER (WHERE t.id IS NOT NULL), '[]') AS tasks
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at
  `;
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json();
  const { id, name, description, color } = body;
  await sql`
    INSERT INTO projects (id, name, description, color)
    VALUES (${id}, ${name}, ${description || ""}, ${color || "#3b82f6"})
  `;
  return NextResponse.json({ id, name, description, color, tasks: [] });
}
