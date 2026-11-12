import { AgentController } from "@mastra/core/agent-controller";
import { codingAgent } from "../agents/coding-agent";
import { codingAgentBaseConfig } from "../lib/config";
import { codingAgentModes, codingAgentSubagents } from "./coding-agent-modes";

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
  });

  await controller.init();

  const session = await controller.createSession({
    id: "local-session",
    ownerId: "local-user",
    resourceId: codingAgentBaseConfig.projectPath,
  });

  return { controller, session };
}
