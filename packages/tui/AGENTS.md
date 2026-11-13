# AGENTS.md

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions.

## State

- Global state always lives in a zustand store under `src/store/`. One store per concern, named after it.
- Server state always goes through react-query under `src/hooks/`. Never fetch from a component, never cache server state in a zustand store, never hold it in a component's `useState`.
- A component reads server state with a query and changes it with a mutation. Zustand holds what the app owns: the open tabs, the active tab, the selection.
- A tab mirrors the mode of its session so the tab bar can label it. The session state query stays the source of truth.
- A query key lives in `queryKeys` in `src/hooks/use-agent.ts`. Never build a key inline.

## UI

- Build from the component library in `src/components/ui/`. Do not hand-roll a widget that the library already has.
- When the library lacks something, add it to the library instead of working around it in feature code. Change the library component's props rather than forking it.
- Colors, spacing, and typography come from `useTheme()`. No hardcoded colors.
- Feature components live in `src/components/` and compose the library. They hold layout, not widget behavior.

## The agent connection

- The TUI talks to the agent over `MastraClient`, through `src/lib/connection.ts`. Nothing else opens a connection.
- The project path is the resource id. Every thread, every memory record, and every session belongs to that resource.
- A tab is a session: its own session id, its own thread, its own run loop, mode, and model. Session ids are generated per tab and never reused.
- Threads are tagged with the project path, so several worktrees of the same repository do not see each other's threads.
- The server does not replay the events missed while the event stream was down. Re-read the thread on reconnect.

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
