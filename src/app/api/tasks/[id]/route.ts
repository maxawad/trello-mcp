import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function query(text: string, params?: unknown[]) {
  const sql = neon(process.env.DATABASE_URL!);
  return sql.query(text, params);
}

async function resolveTaskId(input: string): Promise<string | null> {
  const exact = await query("SELECT id FROM tasks WHERE id = $1", [input]);
  if (exact.length === 1) return exact[0].id;

  if (input.length >= 4) {
    const prefix = `${input}%`;
    const matches = await query("SELECT id FROM tasks WHERE id LIKE $1", [
      prefix,
    ]);
    if (matches.length === 1) return matches[0].id;
    if (matches.length > 1) return "AMBIGUOUS";
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const resolved = await resolveTaskId(rawId);

  if (resolved === "AMBIGUOUS") {
    const prefix = `${rawId}%`;
    const matches = await query(
      "SELECT id, title FROM tasks WHERE id LIKE $1",
      [prefix]
    );
    return NextResponse.json(
      {
        error: "Ambiguous short ID, multiple matches",
        matches: matches.map((m: Record<string, string>) => ({
          id: m.id,
          title: m.title,
        })),
      },
      { status: 400 }
    );
  }
  if (!resolved) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const rows = await query("SELECT * FROM tasks WHERE id = $1", [resolved]);
  const task = rows[0];
  const subtasks = await query(
    "SELECT * FROM tasks WHERE parent_task_id = $1 ORDER BY position, created_at",
    [resolved]
  );

  return NextResponse.json({ ...task, subtasks });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const resolved = await resolveTaskId(rawId);

  if (resolved === "AMBIGUOUS") {
    const prefix = `${rawId}%`;
    const matches = await query(
      "SELECT id, title FROM tasks WHERE id LIKE $1",
      [prefix]
    );
    return NextResponse.json(
      {
        error: "Ambiguous short ID, multiple matches",
        matches: matches.map((m: Record<string, string>) => ({
          id: m.id,
          title: m.title,
        })),
      },
      { status: 400 }
    );
  }
  if (!resolved) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();

  const allowedFields = [
    "title",
    "description",
    "status",
    "start_date",
    "end_date",
    "tags",
    "position",
    "parent_task_id",
    "assigned_to",
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      setClauses.push(`${field} = $${idx++}`);
      values.push(body[field]);
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(resolved);

  await query(
    `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${idx}`,
    values
  );

  const updated = allowedFields.filter((f) => body[f] !== undefined);
  return NextResponse.json({ ok: true, id: resolved, updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const resolved = await resolveTaskId(rawId);

  if (resolved === "AMBIGUOUS") {
    return NextResponse.json(
      { error: "Ambiguous short ID, specify more characters" },
      { status: 400 }
    );
  }
  if (!resolved) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await query("DELETE FROM tasks WHERE id = $1", [resolved]);
  return NextResponse.json({ ok: true, id: resolved });
}
