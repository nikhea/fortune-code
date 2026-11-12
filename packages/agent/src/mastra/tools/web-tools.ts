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

/**
 * Web access tools. Searched and activated through `ToolSearchProcessor`, so
 * they are absent from the prompt until the model calls `search_tools`.
 */
export const webTools = {
  "web-search": renameTool(tavily.tavilySearch, "web-search"),
  "web-extract": renameTool(tavily.tavilyExtract, "web-extract"),
  "web-crawl": renameTool(tavily.tavilyCrawl, "web-crawl"),
  "web-map": renameTool(tavily.tavilyMap, "web-map"),
};
