import type {
  PermissionPolicy,
  ToolCategory,
} from "@mastra/core/agent-controller";

/**
 * YOLO mode approves every tool call without prompting. It is on by default,
 * the same as Mastra Code, and `YOLO_MODE=false` turns it off so the category
 * policies below decide what needs a prompt.
 */
export const yoloMode = process.env.YOLO_MODE !== "false";

/**
 * The tool each category covers. The categories match the Mastra Code
 * permission system: read, edit, execute, and mcp.
 */
const CATEGORY_BY_TOOL: Record<string, ToolCategory> = {
  // Read
  view: "read",
  search_content: "read",
  find_files: "read",
  file_stat: "read",
  lsp_inspect: "read",
  search: "read",
  index: "read",
  "list-workflows": "read",
  "get-workflow": "read",
  search_skills: "read",
  load_skill: "read",
  recall: "read",
  notification_inbox: "read",
  diff: "read",
  task_write: "read",
  task_update: "read",
  task_complete: "read",
  task_check: "read",
  web_search: "read",
  web_fetch: "read",
  web_extract: "read",
  web_crawl: "read",
  web_map: "read",
  search_tools: "read",
  schedule_list: "read",
  schedule_get: "read",
  schedule_triggers: "read",
  "update-working-memory": "read",

  // Edit
  write_file: "edit",
  string_replace_lsp: "edit",
  ast_smart_edit: "edit",
  apply_patch: "edit",
  mkdir: "edit",
  delete: "edit",
  write_plan_file: "edit",
  "create-workflow": "edit",
  "delete-workflow": "edit",
  schedule_create: "edit",
  schedule_update: "edit",
  schedule_pause: "edit",
  schedule_resume: "edit",
  schedule_run: "edit",
  schedule_delete: "edit",
  subagent: "edit",

  // Execute
  execute_command: "execute",
  get_process_output: "execute",
  kill_process: "execute",
  "run-workflow": "execute",
};

/**
 * Maps a tool name to the category its approval policy comes from. A tool
 * that is not listed has no category, and the controller asks for approval by
 * default.
 */
export function resolveToolCategory(toolName: string): ToolCategory | null {
  return CATEGORY_BY_TOOL[toolName] ?? null;
}

/**
 * The policy per category when YOLO mode is off. Reads run on their own,
 * everything that changes something or runs a command asks first.
 */
export const categoryPolicies: Record<ToolCategory, PermissionPolicy> = {
  read: "allow",
  edit: "ask",
  execute: "ask",
  mcp: "ask",
  other: "ask",
};

/**
 * Tools that ask the user for a decision themselves. The suspension is the
 * prompt, so an extra approval gate in front of it would be noise.
 */
export const interactiveTools = ["ask_user", "submit_plan", "request_access"];
