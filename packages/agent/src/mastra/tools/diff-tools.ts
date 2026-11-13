import { createTool } from "@mastra/core/tools";
import { isAbsolute, relative, resolve } from "node:path";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { codingAgentBaseConfig } from "../lib/config";

/** A patch longer than this is cut off, so the diff cannot flood the context. */
const MAX_DIFF_CHARS = 20_000;

/** How many untracked files get their own patch. */
const MAX_UNTRACKED_PATCHES = 20;

type Counts = { additions: number; deletions: number };

/**
 * A path relative to the project root, which is the root the workspace file
 * tools work from. A file outside the project keeps its repository path,
 * because there is no project-relative path for it.
 */
function toProjectPath(repoRoot: string, projectPath: string, repoPath: string) {
  const absolute = resolve(repoRoot, repoPath);
  const fromProject = relative(projectPath, absolute);

  if (fromProject.startsWith("..") || isAbsolute(fromProject)) {
    return repoPath;
  }

  return fromProject || ".";
}

/** The same path, relative to the repository root, for git pathspecs. */
function toRepoPath(repoRoot: string, projectPath: string, input: string) {
  const absolute = isAbsolute(input) ? input : resolve(projectPath, input);
  const fromRepo = relative(repoRoot, absolute);

  return fromRepo.startsWith("..") ? undefined : fromRepo || ".";
}

/** Turns a status code into a word the model can reason about. */
function describeStatus(index: string, workingDir: string): string {
  if (index === "?" || workingDir === "?") return "untracked";
  if (index === "R" || workingDir === "R") return "renamed";
  if (index === "A" || workingDir === "A") return "added";
  if (index === "D" || workingDir === "D") return "deleted";
  if (index === "U" || workingDir === "U") return "conflicted";
  return "modified";
}

/**
 * Reads the line counts out of a `--numstat` block. Git prints every count
 * line first, then a blank line, then the patches.
 */
function parseNumstat(output: string): Map<string, Counts> {
  const counts = new Map<string, Counts>();
  const patchStart = output.indexOf("diff --git");
  const header = (patchStart === -1 ? output : output.slice(0, patchStart))
    .replace(/\n+$/, "");

  for (const line of header.split("\n")) {
    const [additions, deletions, ...rest] = line.split("\t");
    if (!rest.length) continue;

    counts.set(rest.join("\t"), {
      additions: additions === "-" ? 0 : Number(additions),
      deletions: deletions === "-" ? 0 : Number(deletions),
    });
  }

  return counts;
}

/**
 * Reports what changed in the project. The changes come from git, so the
 * tool only reads: the agent can review its own changes and answer what
 * changed without being able to change anything.
 */
export const diffTool = createTool({
  id: "diff",
  description:
    "Show what changed in the project. Returns the files that differ from HEAD and the patch itself, with paths relative to the project root. Use it to review your own changes, to check what another change did, or to answer a question about the current state of the working tree.",
  inputSchema: z.object({
    path: z
      .string()
      .optional()
      .describe(
        "Limit the diff to one file or directory, relative to the project root.",
      ),
    staged: z
      .boolean()
      .optional()
      .describe("Diff the staged changes instead of the working tree."),
    context: z
      .number()
      .int()
      .min(0)
      .max(50)
      .optional()
      .describe("Lines of context around each change (default 3)."),
    stat: z
      .boolean()
      .optional()
      .describe(
        "Return only the file list and the line counts, without the patch.",
      ),
  }),
  outputSchema: z.object({
    isRepository: z.boolean(),
    branch: z.string().nullable(),
    files: z.array(
      z.object({
        path: z.string(),
        repoPath: z.string(),
        status: z.string(),
        staged: z.boolean(),
        additions: z.number(),
        deletions: z.number(),
      }),
    ),
    diff: z.string(),
    truncated: z.boolean(),
    summary: z.object({
      files: z.number(),
      additions: z.number(),
      deletions: z.number(),
    }),
    message: z.string().optional(),
  }),
  execute: async (input) => {
    const projectPath = codingAgentBaseConfig.projectPath;
    const git = simpleGit({ baseDir: projectPath });

    let repoRoot: string;

    try {
      repoRoot = (await git.revparse(["--show-toplevel"])).trim();
    } catch {
      return {
        isRepository: false,
        branch: null,
        files: [],
        diff: "",
        truncated: false,
        summary: { files: 0, additions: 0, deletions: 0 },
        message:
          "This project is not a git repository, so there is no diff to show.",
      };
    }

    // Working from the repository root keeps the pathspecs and the status
    // paths in the same coordinate system.
    const repo = git.cwd(repoRoot);

    let scope: string | undefined;
    if (input.path) {
      scope = toRepoPath(repoRoot, projectPath, input.path);

      if (!scope) {
        return {
          isRepository: true,
          branch: null,
          files: [],
          diff: "",
          truncated: false,
          summary: { files: 0, additions: 0, deletions: 0 },
          message: `${input.path} is outside the repository at ${repoRoot}.`,
        };
      }
    }

    const inScope = (repoPath: string) =>
      !scope || repoPath === scope || repoPath.startsWith(`${scope}/`);

    const status = await repo.status();

    // The default view is the working tree against HEAD, so a change that is
    // already staged still shows up. The staged view is the index alone. A
    // repository without a commit is diffed against the empty tree.
    const head = await repo
      .raw(["rev-parse", "--verify", "HEAD"])
      .then(() => "HEAD")
      .catch(() => "4b825dc642cb6eb9a060e54bf8d69288fbee4904");

    const diffOptions = [
      ...(input.staged ? ["--staged"] : [head]),
      ...(scope ? ["--", scope] : []),
    ];

    const summary = await repo.diffSummary(diffOptions);
    const patch = input.stat
      ? ""
      : await repo.diff([`--unified=${input.context ?? 3}`, ...diffOptions]);

    const counts = new Map<string, Counts>(
      summary.files
        .filter((file) => !("binary" in file && file.binary))
        .map((file) => [
          file.file,
          { additions: file.insertions, deletions: file.deletions },
        ]),
    );

    // Untracked files are not part of `git diff`, so their patch is read
    // against the empty file.
    const untracked = status.files
      .filter((file) => file.index === "?" && inScope(file.path))
      .map((file) => file.path);
    const untrackedCounts = new Map<string, Counts>();
    let untrackedPatch = "";

    for (const repoPath of untracked.slice(0, MAX_UNTRACKED_PATCHES)) {
      const result = await repo.raw([
        "diff",
        "--no-index",
        `--unified=${input.context ?? 3}`,
        "--numstat",
        "--patch",
        "--",
        "/dev/null",
        repoPath,
      ]);

      const counted = [...parseNumstat(result).values()][0];
      if (counted) {
        untrackedCounts.set(repoPath, counted);
      }

      const patchStart = result.indexOf("diff --git");
      if (patchStart !== -1) {
        untrackedPatch += `${result.slice(patchStart)}\n`;
      }
    }

    const entries = [
      ...status.files.filter((file) => inScope(file.path)).filter((file) => {
        if (file.index === "?" && file.working_dir === "?") return false;
        if (input.staged) {
          return file.index !== " " && file.index !== undefined;
        }
        return file.index !== " " || file.working_dir !== " ";
      }),
      // An untracked file is never staged, so it belongs to the working tree
      // view only.
      ...(input.staged
        ? []
        : untracked.map((repoPath) => ({
            path: repoPath,
            index: "?",
            working_dir: "?",
          }))),
    ];

    const files = entries.map((file) => {
      const counted = counts.get(file.path) ?? untrackedCounts.get(file.path);

      return {
        path: toProjectPath(repoRoot, projectPath, file.path),
        repoPath: file.path,
        status: describeStatus(file.index, file.working_dir),
        staged:
          file.index !== " " && file.index !== "?" && file.index !== undefined,
        additions: counted?.additions ?? 0,
        deletions: counted?.deletions ?? 0,
      };
    });

    // The tracked patch comes first, but the untracked patches keep their
    // budget: a new file the agent just wrote is the interesting part.
    const trackedBudget = Math.max(0, MAX_DIFF_CHARS - untrackedPatch.length);
    const trackedPart =
      patch.length > trackedBudget
        ? `${patch.slice(0, trackedBudget)}\n... diff truncated ...`
        : patch;
    const untrackedBudget = Math.max(0, MAX_DIFF_CHARS - trackedPart.length);
    const untrackedPart =
      untrackedPatch.length > untrackedBudget
        ? `${untrackedPatch.slice(0, untrackedBudget)}\n... diff truncated ...`
        : untrackedPatch;
    const fullDiff = `${trackedPart}${untrackedPart}`;
    const truncated = fullDiff.length > MAX_DIFF_CHARS;

    const result = {
      isRepository: true,
      branch: status.current ?? null,
      files,
      diff: input.stat
        ? ""
        : truncated
          ? `${fullDiff.slice(0, MAX_DIFF_CHARS)}\n... diff truncated ...`
          : fullDiff,      truncated: input.stat ? false : truncated,
      summary: {
        files: files.length,
        additions: files.reduce((total, file) => total + file.additions, 0),
        deletions: files.reduce((total, file) => total + file.deletions, 0),
      },
    };

    if (!files.length) {
      return {
        ...result,
        message: input.staged
          ? "No staged changes."
          : "No changes in the working tree.",
      };
    }

    return result;
  },
});
