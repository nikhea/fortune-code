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
- Use view to read a file, find_files to list files, search_content to grep, and file_stat to inspect file metadata.
- Use write_file to create a file, string_replace_lsp to edit one, ast_smart_edit for structure-aware edits, and apply_patch for multi-file patches.
- Use execute_command for shell commands, and search for indexed search and lsp_inspect for language-server diagnostics.
- Use diff to see what changed in the working tree, with the patch and the changed files.
- Use search_skills and load_skill to find and load workspace skills on demand.
- Use \`web_search\` and \`web_fetch\` directly. Use search_tools only to activate \`web_extract\`, \`web_crawl\`, and \`web_map\` when you need them.
- Use only the workspace tools provided to you. Do not attempt unavailable capabilities.`,
});

export const codingAgentBaseConfig = {
  projectPath,
  model,
  instructions: codingAgentInstructions,
};
