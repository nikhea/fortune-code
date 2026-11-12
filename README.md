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

## Tools

The tool set follows the Mastra Code names:

| Group      | Tools                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| Files      | `view`, `write_file`, `string_replace_lsp`, `ast_smart_edit`, `apply_patch`, `find_files`, `file_stat` |
| Search     | `search_content`, `search`, `index`                                                     |
| Shell      | `execute_command`, `get_process_output`, `kill_process`                                 |
| Web        | `web_search`, `web_fetch`, `web_extract`, `web_crawl`, `web_map`                        |
| Tasks      | `task_write`, `task_update`, `task_complete`, `task_check`                             |
| Interactive| `ask_user`, `submit_plan`, `request_access`, `notification_inbox`                      |
| Workflows  | `list-workflows`, `get-workflow`, `create-workflow`, `run-workflow`, `delete-workflow`  |

`ast_smart_edit` needs the optional `@ast-grep/napi` dependency, which is installed.

## Permissions

Tools are grouped into categories, and each category carries an approval policy. With YOLO mode on, every call is approved without a prompt. With `YOLO_MODE=false`, the policies apply:

| Category    | Tools                                             | Policy |
| ----------- | ------------------------------------------------- | ------ |
| **Read**    | `view`, `search_content`, `find_files`, `web_search`, `web_extract`, and the other read-only tools | `allow` |
| **Edit**    | `string_replace_lsp`, `ast_smart_edit`, `write_file`, `subagent`, and the other tools that change something | `ask` |
| **Execute** | `execute_command`, `run-workflow`                  | `ask`  |
| **MCP**     | MCP server tools                                  | `ask`  |

`ask_user`, `submit_plan`, and `request_access` are always allowed: they ask the user for a decision themselves, so an extra gate in front of them would be noise.
