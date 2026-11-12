import { createCodingAgent } from "@mastra/core/coding-agent";
import { codingAgentBaseConfig } from "../lib/config";
import { SkillSearchProcessor, StreamErrorRetryProcessor } from "@mastra/core/processors";
import { Memory } from "@mastra/memory";
import { TaskSignalProvider } from "@mastra/core/signals";
import { askUserTool, submitPlanTool } from "@mastra/core/tools";
import { tavilyTools } from "../tools/tavily-tool";
import { scheduleTools } from "../tools/schedule-tools";
import { codingWorkspace } from "../workspace/coding-workspace";
import { createDurableAgent } from "@mastra/core/agent/durable";

const codingAgent = createCodingAgent({
  id: "coding-agent",
  name: "Coding Agent",
  model: codingAgentBaseConfig.model,
  instructions: [
    { role: "system", content: codingAgentBaseConfig.instructions },
  ],
  basePath: codingAgentBaseConfig.projectPath,
  workspace: codingWorkspace,
  inputProcessors: [
    // On-demand skill discovery: exposes search_skills and load_skill instead
    // of injecting every skill into the system prompt.
    new SkillSearchProcessor({
      workspace: codingWorkspace,
      search: { topK: 5, minScore: 0.1 },
      blockingRefresh: true,
    }),
  ],
  tools: { submitPlanTool, askUserTool, ...tavilyTools, ...scheduleTools },
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
    judge: process.env.JUDGE_MODEL,
    maxRuns: parseInt(process.env.MAX_RUNS || "50"),
  },
  defaultOptions: {
    maxSteps: parseInt(process.env.MAX_STEPS || "100"),
  },
});

const durableCodingAgent = createDurableAgent({ agent: codingAgent });

export { codingAgent, durableCodingAgent };
