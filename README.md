# trello-mcp (Projects Board)

A Trello-style project board you can talk to. You get Kanban and timeline views of your projects and tasks, plus a chat and voice assistant that can move, create, edit and summarize tasks for you. The repository is named `trello-mcp`, but the app itself is a Next.js web app called `projects-board`. It is not an MCP server.

## What it does

- Kanban board with four columns: backlog, todo, in progress, done.
- Timeline (Gantt-style) view of tasks with start and end dates.
- Multiple projects, with tasks, tags, sub-tasks and assignees.
- A small team of named assistant personas (frontend, backend, designer, devops, QA, PM) that tasks can be assigned to.
- A voice and chat assistant built on the OpenAI Realtime API. It can move tasks between columns, edit and create tasks, give a project summary and save feedback about the app.
- First start seeds three sample projects so the board is not empty.

## Tech stack

- Next.js 15 (App Router) with React 19 and TypeScript
- Tailwind CSS 4
- Neon serverless Postgres (`@neondatabase/serverless`)
- OpenAI Realtime API for voice (optional)
- Deployable on Vercel (`vercel.json` is included)

## Run it locally

You need Node.js 18.18 or newer, a Postgres database (a free Neon database works) and optionally an OpenAI API key.

```bash
git clone https://github.com/maxawad/trello-mcp.git
cd trello-mcp
npm install
cp .env.example .env.local
# edit .env.local and fill in DATABASE_URL (and OPENAI_API_KEY for voice)
npm run dev
```

Open http://localhost:3000. The database tables are created and sample data is added automatically on first load.

For a production build run `npm run build` and then `npm start`.

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `OPENAI_API_KEY` | no | Enables the voice assistant |

## Trying it online

This is not a static site. It needs a server and a database, so it cannot be hosted as plain static files. The easiest way to host it is to import the repository on Vercel and set the two environment variables above.

## Deployment note

This is a personal tool and has no user accounts. If you host it, keep the deployment private (for example with Vercel deployment protection) or add your own authentication first.

## Status

Working prototype. It needs a database to run, and an OpenAI API key for the voice feature.

## Project layout

- `src/app/page.tsx`: main page and state handling
- `src/app/components/`: Kanban board, timeline, sidebar, chat panel and the assistant tool definitions
- `src/app/hooks/useRealtimeVoice.ts`: OpenAI Realtime voice connection
- `src/app/api/`: REST routes for projects, tasks, agents, seed data, feedback and the realtime session
