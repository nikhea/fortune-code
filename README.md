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
