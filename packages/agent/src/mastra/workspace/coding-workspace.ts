import {
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
  Workspace,
} from "@mastra/core/workspace";
import { codingAgentBaseConfig } from "../lib/config";

/**
 * The default coding workspace, built explicitly instead of letting
 * `createCodingAgent()` construct it implicitly. It mirrors the built-in
 * default shape (LocalFilesystem + LocalSandbox) and keeps the same base path,
 * with search, LSP diagnostics, and on-demand skills layered on top.
 */
export const codingWorkspace = new Workspace({
  id: "coding-workspace",
  name: "Fortune Code Workspace",
  filesystem: new LocalFilesystem({
    basePath: codingAgentBaseConfig.projectPath,
  }),
  sandbox: new LocalSandbox({
    workingDirectory: codingAgentBaseConfig.projectPath,
  }),
  // Keyword search over indexed content.
  bm25: true,
  autoIndexPaths: ["skills", ".agents/skills"],
  // Skills are discovered here and surfaced on demand by SkillSearchProcessor.
  skills: ["skills", ".agents/skills"],
  // Diagnostics from language servers after edits. TypeScript 7 ships its own
  // LSP server, so no separate typescript-language-server is required.
  lsp: true,
  tools: {
    // Drop the `mastra_workspace_` prefix from every workspace tool name.
    [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: { name: "read_file" },
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { name: "write_file" },
    [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { name: "edit_file" },
    [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: { name: "list_files" },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { name: "delete" },
    [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: { name: "file_stat" },
    [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { name: "mkdir" },
    [WORKSPACE_TOOLS.FILESYSTEM.GREP]: { name: "grep" },
    [WORKSPACE_TOOLS.FILESYSTEM.APPLY_PATCH]: { name: "apply_patch" },
    [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { name: "execute_command" },
    [WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]: { name: "get_process_output" },
    [WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS]: { name: "kill_process" },
    [WORKSPACE_TOOLS.SEARCH.SEARCH]: { name: "search" },
    [WORKSPACE_TOOLS.SEARCH.INDEX]: { name: "index" },
    [WORKSPACE_TOOLS.LSP.LSP_INSPECT]: { name: "lsp_inspect" },
  },
});
