import { ToolSearchProcessor } from "@mastra/core/processors";
import { scheduleTools } from "../tools/schedule-tools";

/**
 * Schedule tools are kept out of the system prompt and discovered on demand.
 * The agent calls `search_tools` to find a schedule tool, then `load_tool` to
 * activate it for the thread. Workspace tools and skills are unaffected.
 */
export const scheduleToolSearchProcessor = new ToolSearchProcessor({
  tools: scheduleTools,
  search: {
    topK: 5,
    minScore: 0.1,
  },
});
