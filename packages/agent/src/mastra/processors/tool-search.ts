import { ToolSearchProcessor } from "@mastra/core/processors";
import { scheduleTools } from "../tools/schedule-tools";
import { webTools } from "../tools/web-tools";

/**
 * Tools kept out of the system prompt and discovered on demand. `autoLoad`
 * activates every match from `search_tools`, so the model never needs a
 * separate `load_tool` call. Workspace tools and skills are unaffected.
 */
export const toolSearchProcessor = new ToolSearchProcessor({
  tools: { ...scheduleTools, ...webTools },
  search: {
    topK: 5,
    minScore: 0.1,
    autoLoad: true,
  },
});
