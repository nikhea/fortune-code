import { Memory } from "@mastra/memory";
import { skillResultRedactor } from "@mastra/memory/hooks";
import { projectMemoryTemplate } from "../instructions/working-memory.instruction";
import { codingAgentBaseConfig } from "../lib/config";

function envNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) ? parsed : fallback;
}

function envBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

/**
 * Idle-activation TTL. `auto` follows the provider's prompt-cache TTL, a
 * numeric string becomes milliseconds, and any duration string passes through.
 */
function envTtl(value: string | undefined, fallback: string): string | number {
  const raw = value ?? fallback;
  const milliseconds = Number(raw);
  return Number.isFinite(milliseconds) ? milliseconds : raw;
}

const observationalMemoryEnabled = envBoolean(process.env.OM_ENABLED, true);
const observationalMemoryModel =
  process.env.OBSERVATIONAL_MEMORY_MODEL ?? codingAgentBaseConfig.model;
const failurePolicy = process.env.OM_FAILURE_POLICY === "abort" ? "abort" : "continue";

/**
 * Production memory for the coding agent.
 *
 * Observational Memory compresses long tool-heavy sessions into observations,
 * so context stays bounded and the prompt prefix stays cacheable. It runs on
 * the thread scope: per-thread observations work better with prompt caching
 * than the deprecated resource scope, and `retrieval` keeps a `recall` tool for
 * reaching older messages when needed. Durable cross-thread facts stay in
 * resource-scoped working memory.
 *
 * Every knob is read from the environment so deployments can tune thresholds
 * without a code change. Defaults target a long-running coding session.
 */
export const codingAgentMemory = new Memory({
  options: {
    lastMessages: envNumber(process.env.MEMORY_LAST_MESSAGES, 20),
    workingMemory: {
      enabled: true,
      scope: "resource",
      // The agent keeps its setWorkingMemory tool even when OM manages memory.
      agentManaged: true,
      useStateSignals: true,
      template: projectMemoryTemplate,
    },
    generateTitle: {
      model: process.env.TITLE_MODEL ?? codingAgentBaseConfig.model,
      instructions:
        "Name the coding task in this thread in six words or fewer. Mention the feature or file, not the conversation.",
    },
    observationalMemory: observationalMemoryEnabled
      ? {
          enabled: true,
          model: observationalMemoryModel,
          // Thread scope with a recall tool beats the deprecated resource scope.
          retrieval: envBoolean(process.env.OM_RETRIEVAL, true)
            ? { scope: process.env.OM_RETRIEVAL_SCOPE === "resource" ? "resource" : "thread" }
            : false,
          activateAfterIdle: envTtl(process.env.OM_ACTIVATE_AFTER_IDLE, "auto"),
          activateOnProviderChange: envBoolean(process.env.OM_ACTIVATE_ON_PROVIDER_CHANGE, true),
          shareTokenBudget: envBoolean(process.env.OM_SHARE_TOKEN_BUDGET, false),
          temporalMarkers: envBoolean(process.env.OM_TEMPORAL_MARKERS, true),
          observation: {
            messageTokens: envNumber(process.env.OM_MESSAGE_TOKENS, 30_000),
            bufferTokens: envNumber(process.env.OM_BUFFER_TOKENS, 0.2),
            bufferActivation: envNumber(process.env.OM_BUFFER_ACTIVATION, 0.8),
            blockAfter: envNumber(process.env.OM_BLOCK_AFTER, 1.2),
            previousObserverTokens: envNumber(process.env.OM_PREVIOUS_OBSERVER_TOKENS, 10_000),
            // generateTitle owns initial titles; OM would rewrite them on topic changes.
            threadTitle: envBoolean(process.env.OM_THREAD_TITLE, false),
            manageWorkingMemory: envBoolean(process.env.OM_MANAGE_WORKING_MEMORY, true),
            observeAttachments: "auto",
            maxRetries: envNumber(process.env.OM_MAX_RETRIES, 8),
            failurePolicy,
          },
          reflection: {
            observationTokens: envNumber(process.env.OM_REFLECTION_TOKENS, 40_000),
            bufferActivation: envNumber(process.env.OM_REFLECTION_BUFFER_ACTIVATION, 0.5),
            blockAfter: envNumber(process.env.OM_BLOCK_AFTER, 1.2),
            maxRetries: envNumber(process.env.OM_MAX_RETRIES, 8),
            failurePolicy,
            activateAfterIdle: envTtl(process.env.OM_ACTIVATE_AFTER_IDLE, "auto"),
            activateOnProviderChange: envBoolean(process.env.OM_ACTIVATE_ON_PROVIDER_CHANGE, true),
          },
          hooks: {
            // Skills return whole documents; keep their text out of the
            // observation log. The tool call and its arguments still survive.
            beforeObservation: skillResultRedactor({
              toolNames: ["search_skills", "load_skill"],
            }),
          },
        }
      : false,
  },
});
