import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const FEEDBACK_DIR = join(process.cwd(), "feedback");

export async function POST(req: Request) {
  const { title, body, category } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
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
    `**Category:** ${category || "other"}`,
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
