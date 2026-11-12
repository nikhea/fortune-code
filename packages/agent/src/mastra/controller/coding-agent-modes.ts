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
 * Workspace tools as the model sees them. The workspace renames them in
 * `coding-workspace.ts`, and these are the renamed names.
 */
const READ_WORKSPACE_TOOLS = [
  "read_file",
  "grep",
  "list_files",
  "file_stat",
  "lsp_inspect",
  "search",
] as const;

const WRITE_WORKSPACE_TOOLS = [
  "write_file",
  "edit_file",
  "apply_patch",
  "mkdir",
  "delete",
] as const;

/**
 * Plan mode reads the project, tracks the work, talks to the user, and writes
 * exactly one thing: the plan file it submits.
 */
const PLAN_TOOLS = [
  ...READ_WORKSPACE_TOOLS,
  "ask_user",
  "submit_plan",
  "write_plan_file",
  "task_write",
  "task_update",
  "task_complete",
  "task_check",
  "search_skills",
  "load_skill",
  "recall",
  "web-search",
  "web_fetch",
];

/**
 * Explore mode answers questions. It reads the project, loads the skills that
 * explain it, and recalls earlier context. Nothing else.
 */
const EXPLORE_TOOLS = [
  ...READ_WORKSPACE_TOOLS,
  "search_skills",
  "load_skill",
  "recall",
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
  },
  {
    id: "plan",
    name: "Plan",
    description:
      "Read-only analysis that ends in a plan submitted for approval.",
    transitionsTo: "build",
    defaultModelId: modeModels.plan,
    instructions: planModeInstructions,
    // Plan mode may not touch the project, so the write tools of the backing
    // agent are hidden and only the plan file stays writable.
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
    allowedWorkspaceTools: [...READ_WORKSPACE_TOOLS],
    defaultModelId: modeModels.explore,
  },
  {
    id: "plan",
    name: "Plan",
    description:
      "Read-only analysis. Use it to design an implementation or to break down an architecture.",
    instructions: planSubagentInstructions,
    allowedWorkspaceTools: [...READ_WORKSPACE_TOOLS],
    defaultModelId: modeModels.plan,
  },
  {
    id: "execute",
    name: "Execute",
    description:
      "Implements a change. Use it for a feature, a bug fix, or a refactor.",
    instructions: executeSubagentInstructions,
    allowedWorkspaceTools: [
      ...READ_WORKSPACE_TOOLS,
      ...WRITE_WORKSPACE_TOOLS,
      "execute_command",
      "get_process_output",
      "kill_process",
    ],
    defaultModelId: modeModels.build,
  },
];
