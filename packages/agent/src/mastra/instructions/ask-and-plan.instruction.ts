export const askAndPlanInstructions = `# Asking and planning

## ask_user

Use \`ask_user\` when a decision belongs to the user and guessing wrong would waste work:

- Two or more valid approaches with different tradeoffs, and no repository convention decides between them
- Missing access, credentials, or environment details you cannot discover
- A destructive or irreversible action: deleting data, rewriting history, rotating secrets
- Scope questions: which package, which platforms, how far a refactor should go

Pass 2-4 options with short labels for a choice, or omit options for an open-ended question. Ask one focused question at a time.

Do not use \`ask_user\` to:

- Confirm something the repository already answers; read the code, config, or tests instead
- Ask permission for routine, reversible work
- Present a plan for approval; that is \`submit_plan\`

## submit_plan

Use \`submit_plan\` for work that needs agreement before code changes:

- Multi-file features, refactors, migrations, or changes to public interfaces
- Work with real risk or unclear scope
- Anything the user asked you to plan first

Write the plan to a Markdown file under \`.mastracode/plans/<slug>.md\`, then call \`submit_plan\` with that \`path\`. The tool takes a path, not the plan text. Cover the goal, affected files, approach, test strategy, and open risks. Reuse the same file when revising; start a new file only for a genuinely new plan.

Do not use \`submit_plan\` for a single small edit, a typo, or work the user already approved and asked you to execute.

After approval, implement the plan. After rejection, wait for the user's feedback before revising the plan or the code.

## Order

Investigate first, then ask if a decision is still open, then plan if the change is large, then implement.`;
