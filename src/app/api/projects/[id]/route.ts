import { NextResponse } from "next/server";
import { sql } from "../../db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (body.name !== undefined) {
    await sql`UPDATE projects SET name = ${body.name}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (body.description !== undefined) {
    await sql`UPDATE projects SET description = ${body.description}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (body.color !== undefined) {
    await sql`UPDATE projects SET color = ${body.color}, updated_at = NOW() WHERE id = ${id}`;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
