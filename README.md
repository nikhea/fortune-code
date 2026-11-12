# fortune-code

Bun workspace monorepo.

## Packages

| Package | Path | Description |
| --- | --- | --- |
| `agent` | `packages/agent/` | Mastra agent |
| `tui` | `packages/tui/` | OpenTUI terminal interface |

## Commands

Run from the repo root:

```sh
bun install          # install all workspace dependencies
bun run dev          # run dev for every workspace
bun run dev:agent    # run the Mastra agent dev server
bun run dev:tui      # run the TUI
bun run build        # build the agent
bun run typecheck    # typecheck every workspace
```

Workspace dependencies are hoisted to the root `node_modules` and resolved through the single root `bun.lock`.

## Modes

The coding agent controller runs in one of three modes. A mode decides which tools the agent may use and how it works.

| Mode     | Tools                                                       | Model                     |
| -------- | ----------------------------------------------------------- | ------------------------- |
| Build    | Everything: read, write, edit, run commands                  | `MODE_BUILD_MODEL`        |
| Plan     | Reads the project, tracks tasks, submits a plan for approval | `MODE_PLAN_MODEL`         |
| Explore  | Reads the project and answers, changes nothing               | `MODE_EXPLORE_MODEL`      |

Build is the default. Plan is read-only for project files: the only file it may write is the plan it submits, and approving that plan switches the session to Build. Explore keeps the `fast` id for compatibility with Mastra Code.

Each mode starts a session with its own model when the session has no selection yet; switching modes keeps the model the session already uses. Plans are written to `.mastracode/plans` unless `MASTRA_PLANS_DIR` says otherwise. See `packages/agent/.env.example` for every knob.
