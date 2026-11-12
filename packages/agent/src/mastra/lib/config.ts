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
- Use read_file for view.
- Use list_files for find_files.
- Use grep for search_content.
- Use execute_command for execute_command.
- Use write_file, edit_file, and file_stat for writing, editing, and inspecting file metadata.
- Use search for indexed search and lsp_inspect for language-server diagnostics.
- Use search_skills and load_skill to find and load workspace skills on demand.
- Use only the workspace tools provided to you. Do not attempt unavailable capabilities.`,
});

export const codingAgentBaseConfig = {
  projectPath,
  model,
  instructions: codingAgentInstructions,
};
