import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function query(text: string, params?: unknown[]) {
  const sql = neon(process.env.DATABASE_URL!);
  return sql.query(text, params);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const parentId = searchParams.get("parent_task_id");
  const assignedTo =
    searchParams.get("assigned_to") || searchParams.get("assignee");
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const id = searchParams.get("id");

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (id) {
    conditions.push(`id = $${idx++}`);
    params.push(id);
  }
  if (projectId) {
    conditions.push(`project_id = $${idx++}`);
    params.push(projectId);
  }
  if (parentId) {
    conditions.push(`parent_task_id = $${idx++}`);
    params.push(parentId);
  }
  if (assignedTo) {
    conditions.push(`assigned_to = $${idx++}`);
    params.push(assignedTo);
  }
  if (status) {
    const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      conditions.push(`status = $${idx++}`);
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      const placeholders = statuses.map(() => `$${idx++}`).join(", ");
      conditions.push(`status IN (${placeholders})`);
      params.push(...statuses);
    }
  }
  if (tag) {
    conditions.push(`$${idx++} = ANY(tags)`);
    params.push(tag);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM tasks ${where} ORDER BY position, created_at`;

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json(
      {
        error:
          "Request body required. Fields: project_id (required), title (required), status, description, tags, parent_task_id, assigned_to",
      },
      { status: 400 }
    );
  }

  const projectId = body.project_id || body.projectId;
  const title = body.title;

  if (!projectId) {
    return NextResponse.json(
      { error: "project_id is required" },
      { status: 400 }
    );
  }
  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const projectCheck = await query("SELECT id FROM projects WHERE id = $1", [
    projectId,
  ]);
  if (projectCheck.length === 0) {
    return NextResponse.json(
      { error: "Invalid project_id" },
      { status: 400 }
    );
  }

  const id =
    body.id ||
    `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const description = body.description || "";
  const taskStatus = body.status || "backlog";
  const startDate = body.start_date || body.startDate || null;
  const endDate = body.end_date || body.endDate || null;
  const tags = body.tags || [];
  const parentTaskId = body.parent_task_id || body.parentTaskId || null;
  const assignedTo = body.assigned_to || body.assignedTo || null;

  try {
    const tagsArray = Array.isArray(tags) ? tags : [];

    await query(
      `INSERT INTO tasks (id, project_id, title, description, status, start_date, end_date, tags, parent_task_id, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        projectId,
        title,
        description,
        taskStatus,
        startDate,
        endDate,
        tagsArray,
        parentTaskId,
        assignedTo,
      ]
    );

    return NextResponse.json({
      ok: true,
      task: { id, project_id: projectId, title, status: taskStatus },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/tasks error:", message);
    return NextResponse.json(
      { error: "Database error", details: message },
      { status: 500 }
    );
  }
}
