import { Mastra } from "@mastra/core/mastra";
import { MastraEditor } from "@mastra/editor";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from "@mastra/core/storage";
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from "@mastra/observability";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { weatherAgent } from "./agents/weather-agent";
import {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { codingAgent, durableCodingAgent } from "./agents/coding-agent";
import { createCodingAgentSession } from "./controller/coding-agent-controller";
import { scheduleTools } from "./tools/schedule-tools";
import { codingWorkspace } from "./workspace/coding-workspace";

// Search only indexes files during init(), so autoIndexPaths (skills) must be
// loaded before the first agent run. Re-running init() rebuilds the index
// instead of duplicating entries.
await codingWorkspace.init();

const codingAgentController = await createCodingAgentSession();
export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, codingAgent, durableCodingAgent },
  tools: { ...scheduleTools },
  agentControllers: { codingAgentController: codingAgentController.controller },
  // Lets Studio collaborators override instructions and manage tools without
  // touching the codebase. Stored versions use the Mastra storage below.
  editor: new MastraEditor(),
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer,
  },
  backgroundTasks: {
    enabled: true,
    globalConcurrency: 10,
    perAgentConcurrency: 5,
    backpressure: "queue",
    defaultTimeoutMs: 300_000,
  },
  storage: new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore("observability"),
    },
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
