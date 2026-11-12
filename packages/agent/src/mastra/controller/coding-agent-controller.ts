import { AgentController } from "@mastra/core/agent-controller";
import { codingAgent } from "../agents/coding-agent";
import { codingAgentBaseConfig } from "../lib/config";

export async function createCodingAgentSession() {
  const workspace = await codingAgent.getWorkspace();

  if (!workspace) {
    throw new Error("The coding agent requires a workspace.");
  }

  const controller = new AgentController({
    id: "coding-agent-controller",
    agent: codingAgent,
    workspace,
    modes: [{ id: "build", name: "Build", metadata: { default: true } }],
    disableBuiltinTools: [
      "ask_user",
      "submit_plan",
      "task_write",
      "task_update",
      "task_complete",
      "task_check",
      "subagent",
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
