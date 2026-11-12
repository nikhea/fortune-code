import { createCodingAgent } from "@mastra/core/coding-agent";
import { codingAgentBaseConfig } from "../lib/config";
import { scheduleInstructions } from "../instructions/schedule.instruction";
import {
  CyberRefusalHandler,
  PrefillErrorHandler,
  ProviderHistoryCompat,
  SkillSearchProcessor,
  StreamErrorRetryProcessor,
  UnsupportedFileHandler,
} from "@mastra/core/processors";
import { Memory } from "@mastra/memory";
import { TaskSignalProvider } from "@mastra/core/signals";
import { askUserTool, submitPlanTool } from "@mastra/core/tools";
import { createDurableAgent } from "@mastra/core/agent/durable";
import { tavilyTools } from "../tools/tavily-tool";
import { codingWorkspace } from "../workspace/coding-workspace";
import { scheduleToolSearchProcessor } from "../processors/schedule-tool-search";
import {
  agentsMdInjector,
  batchPartsProcessor,
  fileUploadProcessor,
  responseCacheProcessor,
  unicodeNormalizer,
} from "../processors/coding-agent-processors";

const codingAgent = createCodingAgent({
  id: "coding-agent",
  name: "Coding Agent",
  model: codingAgentBaseConfig.model,
  instructions: [
    { role: "system", content: codingAgentBaseConfig.instructions },
    { role: "system", content: scheduleInstructions },
  ],
  basePath: codingAgentBaseConfig.projectPath,
  workspace: codingWorkspace,
  inputProcessors: [
    // Normalize incoming text before anything else reads it.
    unicodeNormalizer,
    // On-demand skill discovery: exposes search_skills and load_skill instead
    // of injecting every skill into the system prompt.
    new SkillSearchProcessor({
      workspace: codingWorkspace,
      search: { topK: 5, minScore: 0.1 },
      blockingRefresh: true,
    }),
    // Schedule tools load on demand via search_tools and load_tool.
    scheduleToolSearchProcessor,
    // Picks up nested AGENTS.md files from directories the agent works in.
    agentsMdInjector,
    // Sends unreadable attachments to the sandbox instead of the model.
    fileUploadProcessor,
    // Caches model responses per prompt and step.
    responseCacheProcessor,
  ],
  outputProcessors: [batchPartsProcessor, new CyberRefusalHandler()],
  tools: { submitPlanTool, askUserTool, ...tavilyTools },
  signals: [new TaskSignalProvider()],
  memory: new Memory({
    options: {
      lastMessages: 20,
    },
  }),
  errorProcessors: [
    // Repair processors run first; each can short-circuit with a retry.
    new ProviderHistoryCompat(),
    new PrefillErrorHandler(),
    new UnsupportedFileHandler(),
    // Must come before StreamErrorRetryProcessor so a refusal is nudged
    // instead of resending the same rejected request.
    new CyberRefusalHandler(),
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
