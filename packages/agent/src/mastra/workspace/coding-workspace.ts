import { LocalFilesystem, LocalSandbox, Workspace } from "@mastra/core/workspace";
import { codingAgentBaseConfig } from "../lib/config";

/**
 * The default coding workspace, built explicitly instead of letting
 * `createCodingAgent()` construct it implicitly. It mirrors the built-in
 * default shape (LocalFilesystem + LocalSandbox) and keeps the same base path,
 * so swapping the backends later doesn't change how the agent is wired.
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
});
