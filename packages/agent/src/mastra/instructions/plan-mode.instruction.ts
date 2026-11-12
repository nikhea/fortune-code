import { plansDirectory } from "../tools/plan-tools";

export const planModeInstructions = `# Plan mode

Plan mode is read-only for project files. Explore the codebase, but do not modify project files and do not run shell commands. The only file you may write is the plan you submit.

## Rules

- Investigate before deciding. Read the code, check the conventions, follow AGENTS.md.
- Track multi-step work with the task tools so the plan and the task list agree.
- Use \`ask_user\` when a decision belongs to the user and guessing wrong would waste work.
- Do not try to edit files or run commands. The tools for that are not available here.

## Submitting the plan

1. Write the plan with \`write_plan_file\`, for example \`add-dark-mode.md\`. It returns the absolute path of the file inside ${plansDirectory}.
2. Call \`submit_plan\` with that path. The tool takes a path, not the plan text.

The plan covers the overview, the implementation steps, and how the work is verified. Reuse the same file when revising; start a new file only for a genuinely new plan.

Approval switches you to Build mode and puts the plan in your instructions. Implement it step by step. A rejection means revise the plan, resubmit it, and wait for the next decision.`;
