import type { Tool } from "@mastra/core/tools";
import { createTavilyTools } from "@mastra/tavily";

const tavily = createTavilyTools({
  apiKey: process.env.TAVILY_API_KEY || "",
});

/**
 * The Tavily package hard-codes `tavily-*` ids. `Tool.id` is a writable field,
 * so rename in place to a provider-neutral name the model can reason about.
 */
function renameTool(tool: Tool<any, any>, id: string): Tool<any, any> {
  return Object.assign(tool, { id });
}

/** Attached directly to the agent, since search is needed on most tasks. */
export const webSearchTool = renameTool(tavily.tavilySearch, "web-search");

/**
 * Web tools that stay out of the prompt and are activated on demand through
 * `ToolSearchProcessor`.
 */
export const webTools = {
  "web-extract": renameTool(tavily.tavilyExtract, "web-extract"),
  "web-crawl": renameTool(tavily.tavilyCrawl, "web-crawl"),
  "web-map": renameTool(tavily.tavilyMap, "web-map"),
};
