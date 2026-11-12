import { basename } from "node:path";
import { buildBasePrompt } from "@mastra/core/coding-agent";

const projectPath = process.cwd();

const model = process.env.MAIN_MODEL!;

const codingAgentInstructions = buildBasePrompt({
  projectPath,
  projectName: basename(projectPath),
  platform: process.platform,
  date: new Date().toISOString().slice(0, 10),
  mode: "build",
  modelId: model,
  productName: process.env.PRODUCT_NAME,
  coAuthorName: process.env.CO_AUTHOR_NAME,
  coAuthorEmail: process.env.CO_AUTHOR_EMAIL,
  toolGuidance: `# Workspace tools
- Use mastra_workspace_read_file for view.
- Use mastra_workspace_list_files for find_files.
- Use mastra_workspace_grep for search_content.
- Use mastra_workspace_execute_command for execute_command.
- Use mastra_workspace_write_file, mastra_workspace_edit_file, and mastra_workspace_file_stat for writing, editing, and inspecting file metadata.
- Use only the workspace tools provided to you. Do not attempt unavailable capabilities.`,
});

export const codingAgentBaseConfig = {
  projectPath,
  model,
  instructions: codingAgentInstructions,
};
