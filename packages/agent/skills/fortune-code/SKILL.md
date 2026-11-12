---
name: fortune-code
description: "Guide to the Fortune Code agent package: source layout, scripts, environment variables, and how agents, tools, workspace, and schedules are wired. Use when working on this repository."
---

# Fortune Code agent package

## Layout

- `src/mastra/index.ts` — the Mastra instance. Register every agent, tool, workflow, and scorer here.
- `src/mastra/agents/` — agent definitions (`coding-agent.ts`, `weather-agent.ts`).
- `src/mastra/controller/` — `AgentController` setup and sessions.
- `src/mastra/tools/` — custom tools (`tavily-tool.ts`, `schedule-tools.ts`, `weather-tool.ts`).
- `src/mastra/workspace/` — the coding workspace (filesystem, sandbox, search, LSP, skills).
- `src/mastra/lib/config.ts` — shared agent config and the base prompt.
- `skills/` — workspace skills, discovered on demand.

## Commands

Run from `packages/agent`:

- `bun run dev` — start Mastra Studio on http://localhost:4111.
- `bun run build` — production build.
- `bun run start` — run the built app.
- `bun run typecheck` — type-check the package.

Never call `mastra dev` or `mastra build` directly; use the package scripts.

## Environment

`MAIN_MODEL`, `JUDGE_MODEL`, `MAX_RUNS`, `MAX_STEPS`, `PRODUCT_NAME`, `CO_AUTHOR_NAME`, `CO_AUTHOR_EMAIL`, and `TAVILY_API_KEY` are read from `.env`.

## Workspace tools

Workspace tools drop the `mastra_workspace_` prefix: `read_file`, `write_file`, `edit_file`, `list_files`, `delete`, `file_stat`, `mkdir`, `grep`, `execute_command`, `search`, `index`, and `lsp_inspect`.

## Conventions

- Prefer workspace tools over shell commands for reading and editing files.
- Register new tools in both the agent that uses them and `src/mastra/index.ts`.
- Schedules are managed through the `schedule_*` tools backed by `mastra.schedules`.
