import { createCodingAgent } from "@mastra/core/coding-agent";
import { codingAgentBaseConfig } from "../lib/config";
import { StreamErrorRetryProcessor } from "@mastra/core/processors";
import { Memory } from "@mastra/memory";
import { TaskSignalProvider } from "@mastra/core/signals";
import { askUserTool, submitPlanTool } from "@mastra/core/tools";

export const codingAgent = createCodingAgent({
  id: "coding-agent",
  name: "Coding Agent",
  model: codingAgentBaseConfig.model,
  instructions: [
    {
      role: "system",
      content: codingAgentBaseConfig.instructions,
    },
  ],
  basePath: codingAgentBaseConfig.projectPath,
  tools: { submitPlanTool, askUserTool },
  signals: [new TaskSignalProvider()],
  memory: new Memory({
    options: {
      lastMessages: 20,
    },
  }),
  errorProcessors: [
    new StreamErrorRetryProcessor({
      retryUnknownErrors: true,
      maxRetries: 5,
      delayMs: ({ retryCount }) => Math.min(1000 * 2 ** retryCount, 30000),
    }),
  ],
  goal: {
    judge: "anthropic/claude-haiku-5-5",
    maxRuns: 50,
    prompt: "Return `complete` when the code compiles and tests pass.",
  },
  defaultOptions: {
    maxSteps: 50,
  },
});
