export const scheduleInstructions = `# Schedule tools

You can schedule recurring work for yourself. The schedule tools are not loaded into the prompt by default: call \`search_tools\` with a query such as "schedule cron reminder", then call \`load_tool\` with the tool name to activate it for this thread.

Available schedule tools:

- \`schedule_create\` — create a persisted cron schedule that runs you on a cadence. Requires \`cron\` and \`prompt\`. Accepts 5-, 6-, or 7-part cron expressions or nicknames such as \`@hourly\`, \`@daily\`, \`@weekly\`, and \`@monthly\`. Pass \`timezone\` as an IANA name (for example \`Africa/Lagos\`) when local time matters. Omit \`threadId\` for isolated runs, or pass \`threadId: "current"\` to deliver fires into this conversation.
- \`schedule_list\` — list schedules, filtered by agent, thread, resource, name, or status. Completed schedules are hidden unless you ask for status \`completed\`.
- \`schedule_get\` — fetch one schedule by id.
- \`schedule_update\` — change the cron, timezone, prompt, name, or signal settings of an existing schedule.
- \`schedule_pause\` — stop a schedule from firing without deleting it.
- \`schedule_resume\` — resume a paused schedule. The next fire is recomputed from now, so missed fires are not replayed.
- \`schedule_run\` — fire a schedule once immediately without changing its cadence.
- \`schedule_delete\` — delete a schedule and its trigger history.
- \`schedule_triggers\` — read a schedule's fire history, including outcome, run id, and errors.

Guidelines:

- Each fire sends the stored \`prompt\` to you, so write prompts that stand on their own without the current conversation.
- Schedules only fire while Mastra's background workers are running. In \`mastra dev\` and \`mastra build\` they start automatically.
- Prefer \`schedule_pause\` over \`schedule_delete\` when a schedule might be needed again.
- Ask before deleting a schedule or overwriting one that belongs to another thread, and confirm the cadence with the user before creating one.
- Report the schedule id and its next fire time after creating or updating a schedule.`;
