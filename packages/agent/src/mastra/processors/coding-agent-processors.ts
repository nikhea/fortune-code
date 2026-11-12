import { InMemoryServerCache } from "@mastra/core/cache";
import {
  AgentsMDInjector,
  BatchPartsProcessor,
  FileUploadProcessor,
  ResponseCache,
  UnicodeNormalizer,
} from "@mastra/core/processors";
import { codingAgentBaseConfig } from "../lib/config";
import { codingWorkspace } from "../workspace/coding-workspace";

/**
 * Normalizes incoming text to NFKC, strips control characters, collapses
 * whitespace, and trims, so prompts reach the model in a consistent shape.
 */
export const unicodeNormalizer = new UnicodeNormalizer({
  stripControlChars: true,
  preserveEmojis: true,
  collapseWhitespace: true,
  trim: true,
});

/**
 * Loads AGENTS.md / CLAUDE.md / CONTEXT.md from the directory ancestry of the
 * paths the agent touches, so nested instruction files reach the model without
 * being pasted into the system prompt.
 */
export const agentsMdInjector = new AgentsMDInjector({
  maxTokens: 1000,
  getBasePath: () => codingAgentBaseConfig.projectPath,
});

const readByModel = ["image/", "audio/", "video/", "text/"];

/**
 * Moves user attachments the model can't read natively (spreadsheets, archives,
 * binaries) into the workspace sandbox and hands the model a path instead.
 * Images, audio, video, text, and PDFs stay inline.
 */
export const fileUploadProcessor = new FileUploadProcessor({
  workspace: codingWorkspace,
  filter: ({ mimeType }) =>
    mimeType !== "application/pdf" && !readByModel.some((prefix) => mimeType.startsWith(prefix)),
});

/** Coalesces streamed parts to cut chunk frequency for clients. */
export const batchPartsProcessor = new BatchPartsProcessor({
  batchSize: 5,
  maxWaitTime: 100,
  emitOnNonText: true,
});

/**
 * Caches model responses per prompt and step. Each step of an agentic loop is
 * cached independently, keyed on the resolved prompt and resource scope.
 */
export const responseCacheProcessor = new ResponseCache({
  cache: new InMemoryServerCache(),
  ttl: 300,
  agentId: "coding-agent",
});
