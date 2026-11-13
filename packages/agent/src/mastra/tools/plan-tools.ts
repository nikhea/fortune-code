import { createTool } from "@mastra/core/tools";
import { LocalFilesystem } from "@mastra/core/workspace";
import { isAbsolute, resolve, sep } from "node:path";
import { z } from "zod";
import { codingAgentBaseConfig } from "../lib/config";

/**
 * Where plans are written. Project-local by default so a plan is reviewable
 * next to the code it describes. `MASTRA_PLANS_DIR` moves it elsewhere.
 */
export const plansDirectory = process.env.MASTRA_PLANS_DIR ?? ".mastracode/plans";

/** Absolute path of the plans directory. */
export const plansRoot = isAbsolute(plansDirectory)
  ? plansDirectory
  : resolve(codingAgentBaseConfig.projectPath, plansDirectory);

/**
 * Plans are written through a filesystem of their own, so a path that escapes
 * the plans directory is rejected instead of landing in the project.
 */
const plansFilesystem = new LocalFilesystem({
  basePath: plansRoot,
  contained: true,
});

/**
 * Writes the plan that `submit_plan` points at. Plan mode has no write access
 * to the project, so this is the only file it may create.
 */
export const writePlanFileTool = createTool({
  id: "write_plan_file",
  description: `Write an implementation plan to the plans directory (${plansDirectory}). Only Markdown files inside that directory can be written. Returns the absolute path to pass to submit_plan.`,
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "Plan file name relative to the plans directory, for example `add-dark-mode.md`.",
      ),
    content: z.string().describe("Full Markdown content of the plan."),
  }),
  outputSchema: z.object({
    path: z.string().describe("Absolute path of the written plan file."),
    plansDirectory: z.string(),
    bytes: z.number(),
  }),
  execute: async ({ path, content }) => {
    if (!path.toLowerCase().endsWith(".md")) {
      throw new Error("Plan files must be Markdown (.md).");
    }

    if (path.includes("/") || path.includes("\\")) {
      throw new Error(
        `Plan files live directly in the plans directory (${plansDirectory}).`,
      );
    }

    const target = resolve(plansRoot, path);

    if (target !== plansRoot && !target.startsWith(plansRoot + sep)) {
      throw new Error(
        `Plan path must stay inside the plans directory (${plansRoot}).`,
      );
    }

    await plansFilesystem.writeFile(path, content, {
      recursive: true,
      overwrite: true,
    });

    return {
      path: target,
      plansDirectory: plansRoot,
      bytes: Buffer.byteLength(content, "utf8"),
    };
  },
});
