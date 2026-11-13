import { AgentController } from "@mastra/core/agent-controller";
import { codingAgent } from "../agents/coding-agent";
import { codingAgentBaseConfig } from "../lib/config";
import { codingAgentModes, codingAgentSubagents } from "./coding-agent-modes";
import {
  categoryPolicies,
  interactiveTools,
  resolveToolCategory,
  yoloMode,
} from "./coding-agent-permissions";

export async function createCodingAgentSession() {
  const workspace = await codingAgent.getWorkspace();

  if (!workspace) {
    throw new Error("The coding agent requires a workspace.");
  }

  const controller = new AgentController({
    id: "coding-agent-controller",
    agent: codingAgent,
    workspace,
    modes: codingAgentModes,
    subagents: codingAgentSubagents,
    // The agent already provides these through its own toolset, so the
    // controller copies are dropped to keep one implementation per tool.
    disableBuiltinTools: [
      "ask_user",
      "submit_plan",
      "task_write",
      "task_update",
      "task_complete",
      "task_check",
    ],
    // Decides which category a tool's approval policy comes from.
    toolCategoryResolver: resolveToolCategory,
  });

  await controller.init();

  // Every session gets the same approval behavior. YOLO mode approves every
  // call; without it, the category policies decide what asks first.
  controller.onSessionCreated(
    async (session) => {
      if (yoloMode) {
        await session.state.set({ yolo: true });
        return;
      }

      for (const [category, policy] of Object.entries(categoryPolicies)) {
        await session.permissions.setForCategory({
          category: category as keyof typeof categoryPolicies,
          policy,
        });
      }

      // These tools ask the user for a decision themselves, so they are not
      // gated a second time.
      for (const toolName of interactiveTools) {
        await session.permissions.setForTool({ toolName, policy: "allow" });
      }
    },
    { blocking: true },
  );

  const session = await controller.createSession({
    id: "local-session",
    ownerId: "local-user",
    resourceId: codingAgentBaseConfig.projectPath,
  });

  return { controller, session };
}
