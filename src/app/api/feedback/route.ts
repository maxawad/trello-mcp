import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const FEEDBACK_DIR = join(process.cwd(), "feedback");

export async function POST(req: Request) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title, body, category } = payload ?? {};
  if (typeof title !== "string" || typeof body !== "string" || !title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }
  if (title.length > 200 || body.length > 5000) {
    return NextResponse.json({ error: "title or body too long" }, { status: 413 });
  }

  await mkdir(FEEDBACK_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const filename = `${timestamp}_${slug}.md`;

  const content = [
    `# ${title}`,
    "",
    `**Category:** ${typeof category === "string" ? category.slice(0, 50) : "other"}`,
    `**Date:** ${new Date().toISOString()}`,
    "",
    body,
    "",
  ].join("\n");

  await writeFile(join(FEEDBACK_DIR, filename), content, "utf-8");

  return NextResponse.json({ saved: filename });
}

export async function GET() {
  const { readdir, readFile } = await import("fs/promises");
  try {
    const files = await readdir(FEEDBACK_DIR);
    const feedbacks = await Promise.all(
      files
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .map(async (f) => ({
          filename: f,
          content: await readFile(join(FEEDBACK_DIR, f), "utf-8"),
        }))
    );
    return NextResponse.json(feedbacks);
  } catch {
    return NextResponse.json([]);
  }
}
