import { createTool } from "@mastra/core/tools";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * A filesystem that can widen the set of paths it serves. The workspace
 * filesystem is contained to the project root; `request_access` is how a
 * directory outside that root is opened, and only after the user says so.
 */
type GrantableFilesystem = {
  allowedPaths?: readonly string[];
  setAllowedPaths?: (paths: string[] | ((prev: readonly string[]) => string[])) => void;
};

function grantAccess(workspace: { filesystem?: unknown } | undefined, path: string) {
  const filesystem = workspace?.filesystem as GrantableFilesystem | undefined;

  if (!filesystem?.setAllowedPaths) {
    return false;
  }

  const current = filesystem.allowedPaths ?? [];
  const target = resolve(path);

  if (current.includes(target)) {
    return true;
  }

  filesystem.setAllowedPaths([...current, target]);

  return true;
}

/**
 * Asks the user for access to a directory outside the project root. The tool
 * suspends the run, the host renders the request, and the answer resumes the
 * tool: an approval adds the directory to the workspace's allowed paths.
 */
export const requestAccessTool = createTool({
  id: "request_access",
  description:
    "Request access to a directory outside the project root. The user is prompted to approve or deny the request. Use this once, after a permission error tells you the path is outside the project.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Absolute path to the directory needing access."),
    reason: z.string().describe("Explanation of why access is needed."),
  }),
  suspendSchema: z.object({
    path: z.string(),
    reason: z.string(),
  }),
  // The host answers with "Yes" or "No". An explicit `{ approved }` is
  // accepted too, so a host that prefers a structured answer can use it.
  resumeSchema: z.union([
    z.string(),
    z.object({ approved: z.boolean(), note: z.string().optional() }),
  ]),
  execute: async ({ path, reason }, context) => {
    const resumeData = context?.agent?.resumeData;
    const approved =
      typeof resumeData === "string"
        ? /^(yes|y|approve|approved|allow|allowed)$/i.test(resumeData.trim())
        : Boolean(resumeData?.approved);

    if (resumeData !== undefined) {
      if (!approved) {
        return {
          path,
          granted: false,
          reason,
          message: `Access to ${path} was denied. Continue without it.`,
        };
      }

      const granted = grantAccess(context?.workspace, path);

      return {
        path,
        granted,
        reason,
        message: granted
          ? `Access to ${path} granted.`
          : `Access to ${path} was approved, but this workspace does not support widening its allowed paths.`,
      };
    }

    const suspend = context?.agent?.suspend;

    if (suspend) {
      await suspend({ path, reason });
      return;
    }

    return {
      path,
      granted: false,
      reason,
      message: `Access to ${path} was requested but no user is available to approve it.`,
    };
  },
});
