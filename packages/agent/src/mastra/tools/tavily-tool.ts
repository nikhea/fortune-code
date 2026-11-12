import { createTavilyTools } from "@mastra/tavily";

export const tavilyTools = createTavilyTools({
  apiKey: process.env.TAVILY_API_KEY || "",
});
