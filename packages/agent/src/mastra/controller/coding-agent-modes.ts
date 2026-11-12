import type {
  AgentControllerMode,
  AgentControllerSubagent,
} from "@mastra/core/agent-controller";
import { codingAgentBaseConfig } from "../lib/config";
import { buildModeInstructions } from "../instructions/build-mode.instruction";
import { planModeInstructions } from "../instructions/plan-mode.instruction";
import { exploreModeInstructions } from "../instructions/explore-mode.instruction";
import { writePlanFileTool } from "../tools/plan-tools";

/**
 * Models a session starts with, per mode. A mode switch keeps the model the
 * session already uses, so these only seed a session that has no selection
 * yet. Every value is overridable so a deployment can point a mode at a
 * different model without a code change.
 */
export const modeModels = {
  build: process.env.MODE_BUILD_MODEL || codingAgentBaseConfig.model,
  plan: process.env.MODE_PLAN_MODEL || codingAgentBaseConfig.model,
  explore: process.env.MODE_EXPLORE_MODEL || "openai/gpt-5.4-mini",
};

/**
 * The tool set, split by what a tool does to the project. The names are the
 * ones the model sees: the workspace renames its tools in
 * `coding-workspace.ts`, and everything else is registered under its own id.
 */

/** Workspace tools that read the project without changing it. */
const READ_TOOLS = [
  "view",
  "search_content",
  "find_files",
  "file_stat",
  "lsp_inspect",
  "search",
];

/** Workspace tools that change the project. */
const WRITE_TOOLS = [
  "write_file",
  "string_replace_lsp",
  "ast_smart_edit",
  "apply_patch",
  "mkdir",
  "delete",
];

/** Tools that run commands in the sandbox. */
const SHELL_TOOLS = [
  "execute_command",
  "get_process_output",
  "kill_process",
];

/** Web tools, plus the meta tool that activates the ones held back. */
const WEB_TOOLS = [
  "web_search",
  "web_fetch",
  "web_extract",
  "web_crawl",
  "web_map",
  "search_tools",
];

/** Schedule tools, activated on demand through `search_tools`. */
const SCHEDULE_TOOLS = [
  "schedule_create",
  "schedule_list",
  "schedule_get",
  "schedule_update",
  "schedule_pause",
  "schedule_resume",
  "schedule_run",
  "schedule_delete",
  "schedule_triggers",
];

/** Task tracking. */
const TASK_TOOLS = [
  "task_write",
  "task_update",
  "task_complete",
  "task_check",
];

/** Skills, memory, and the tools that reach the conversation's context. */
const CONTEXT_TOOLS = ["search_skills", "load_skill", "recall"];

/** Reading the workflows registered on the server. */
const WORKFLOW_READ_TOOLS = ["list-workflows", "get-workflow"];

/** Creating, running, and deleting workflows. */
const WORKFLOW_WRITE_TOOLS = [
  "create-workflow",
  "run-workflow",
  "delete-workflow",
];

/**
 * Build changes the project. It is the only mode that writes files, runs
 * commands, or reaches the web, and it is the only mode that can spawn a
 * subagent. `submit_plan` is Plan mode's tool, so it is not here.
 */
const BUILD_TOOLS = [
  ...READ_TOOLS,
  ...WRITE_TOOLS,
  ...SHELL_TOOLS,
  ...WEB_TOOLS,
  ...SCHEDULE_TOOLS,
  ...TASK_TOOLS,
  ...CONTEXT_TOOLS,
  ...WORKFLOW_READ_TOOLS,
  ...WORKFLOW_WRITE_TOOLS,
  "index",
  "update-working-memory",
  "ask_user",
  "request_access",
  "notification_inbox",
  "subagent",
];

/**
 * Plan reads the project, tracks the work, and talks to the user. The only
 * file it may write is the plan it submits, so the write tools of the backing
 * agent stay out of the mode. `write_plan_file` takes their place.
 */
const PLAN_TOOLS = [
  ...READ_TOOLS,
  ...TASK_TOOLS,
  ...CONTEXT_TOOLS,
  ...WORKFLOW_READ_TOOLS,
  "write_plan_file",
  "ask_user",
  "submit_plan",
  "notification_inbox",
];

/**
 * Explore answers questions about the codebase. It reads and it recalls; it
 * does not track tasks, reach the web, or change anything.
 */
const EXPLORE_TOOLS = [
  ...READ_TOOLS,
  ...CONTEXT_TOOLS,
  ...WORKFLOW_READ_TOOLS,
  "ask_user",
];

/**
 * The three modes of the coding agent.
 *
 * - Build is the default and the only mode that changes the project.
 * - Plan is read-only and ends in a submitted plan. Approving it switches the
 *   session to Build.
 * - Explore answers codebase questions without planning or implementing. It
 *   keeps the `fast` id for compatibility with Mastra Code.
 */
export const codingAgentModes: AgentControllerMode[] = [
  {
    id: "build",
    name: "Build",
    description: "Full access: read, write, edit files, and run commands.",
    metadata: { default: true },
    defaultModelId: modeModels.build,
    instructions: buildModeInstructions,
    availableTools: BUILD_TOOLS,
  },
  {
    id: "plan",
    name: "Plan",
    description:
      "Read-only analysis that ends in a plan submitted for approval.",
    transitionsTo: "build",
    defaultModelId: modeModels.plan,
    instructions: planModeInstructions,
    availableTools: PLAN_TOOLS,
    additionalTools: { write_plan_file: writePlanFileTool },
  },
  {
    id: "fast",
    name: "Explore",
    description: "Fast read-only answers about the codebase.",
    defaultModelId: modeModels.explore,
    instructions: exploreModeInstructions,
    availableTools: EXPLORE_TOOLS,
  },
];

const exploreSubagentInstructions = `You explore a codebase without changing it.

Search broadly first, then read the files that matter. You cannot write files or run commands. Answer with what the code does and where it lives, naming files and lines.`;

const planSubagentInstructions = `You analyze a codebase and produce an implementation plan.

You cannot write files or run commands. Investigate the existing code and its conventions, then return a plan: the overview, the implementation steps with the files they touch, and how the work is verified.`;

const executeSubagentInstructions = `You implement changes in a codebase.

Follow the conventions already in the repository. Make the change, then verify it: run the tests or the type-check, and report what you ran and what it said. Leave no debug statements behind.`;

/**
 * Subagents the parent agent can spawn in Build mode. Each one runs with a
 * constrained toolset: the read-only agents cannot change anything, and only
 * Execute can.
 */
export const codingAgentSubagents: AgentControllerSubagent[] = [
  {
    id: "explore",
    name: "Explore",
    description:
      "Read-only exploration. Use it to find usages of a symbol or to explain how a module works.",
    instructions: exploreSubagentInstructions,
    allowedWorkspaceTools: ["view", "search_content", "find_files", "file_stat", "lsp_inspect", "search"],
    defaultModelId: modeModels.explore,
  },
  {
    id: "plan",
    name: "Plan",
    description:
      "Read-only analysis. Use it to design an implementation or to break down an architecture.",
    instructions: planSubagentInstructions,
    allowedWorkspaceTools: ["view", "search_content", "find_files", "file_stat", "lsp_inspect", "search"],
    defaultModelId: modeModels.plan,
  },
  {
    id: "execute",
    name: "Execute",
    description:
      "Implements a change. Use it for a feature, a bug fix, or a refactor.",
    instructions: executeSubagentInstructions,
    allowedWorkspaceTools: [
      ...READ_TOOLS,
      ...WRITE_TOOLS,
      ...SHELL_TOOLS,
    ],
    defaultModelId: modeModels.build,
  },
];
