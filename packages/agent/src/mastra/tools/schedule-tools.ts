import type { AnySchedule } from "@mastra/core/schedules";
import { createTool, type ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";

const scheduleStatusSchema = z.enum(["active", "paused", "completed"]);

const scheduleViewSchema = z.object({
  id: z.string(),
  agentId: z.string().optional(),
  name: z.string().optional(),
  prompt: z.string().optional(),
  cron: z.string(),
  timezone: z.string().optional(),
  status: scheduleStatusSchema,
  threadId: z.string().optional(),
  resourceId: z.string().optional(),
  nextFireAt: z.string().describe("ISO 8601 timestamp of the next scheduled fire"),
  lastFireAt: z.string().optional().describe("ISO 8601 timestamp of the last fire"),
  lastRunId: z.string().optional(),
  createdAt: z.string().describe("ISO 8601 timestamp"),
  updatedAt: z.string().describe("ISO 8601 timestamp"),
});

const toIso = (value?: number) => (value === undefined ? undefined : new Date(value).toISOString());

function toScheduleView(schedule: AnySchedule) {
  return {
    id: schedule.id,
    agentId: schedule.agentId,
    name: "name" in schedule ? schedule.name : undefined,
    prompt: "prompt" in schedule ? schedule.prompt : undefined,
    cron: schedule.cron,
    timezone: schedule.timezone,
    status: schedule.status,
    threadId: "threadId" in schedule ? schedule.threadId : undefined,
    resourceId: schedule.resourceId,
    nextFireAt: toIso(schedule.nextFireAt)!,
    lastFireAt: toIso(schedule.lastFireAt),
    lastRunId: schedule.lastRunId,
    createdAt: toIso(schedule.createdAt)!,
    updatedAt: toIso(schedule.updatedAt)!,
  };
}

function getSchedules(context: ToolExecutionContext) {
  const schedules = context?.mastra?.schedules;

  if (!schedules) {
    throw new Error(
      "Schedule tools require a running Mastra instance. Run them from a Mastra agent or server, not standalone.",
    );
  }

  return schedules;
}

const missingAgentId =
  "No agentId was provided and the tool could not infer one from the current agent run. Pass agentId explicitly.";

export const createScheduleTool = createTool({
  id: "schedule_create",
  description:
    "Create a persisted cron schedule that runs an agent on a recurring cadence. Each fire sends `prompt` to the agent. Without a threadId the fire is an isolated run; with a threadId the prompt is delivered into that conversation as a signal. Cron accepts 5-, 6-, or 7-part expressions or Croner nicknames such as @hourly, @daily, or @weekly. Schedules only fire while Mastra's background workers are running.",
  inputSchema: z.object({
    agentId: z
      .string()
      .optional()
      .describe("Agent to run on each fire. Defaults to the agent calling this tool."),
    id: z
      .string()
      .optional()
      .describe(
        "Stable schedule id for later lookups. Normalized to `agent_<slug>`. Omit to generate one.",
      ),
    cron: z
      .string()
      .describe("Cron expression (5, 6, or 7 parts) or a nickname such as `@daily`."),
    timezone: z
      .string()
      .optional()
      .describe("IANA timezone used to resolve fire times, for example `America/New_York`."),
    prompt: z.string().describe("Prompt sent to the agent on every fire."),
    name: z.string().optional().describe("Free-form label to tell schedules apart."),
    threadId: z
      .string()
      .optional()
      .describe(
        'Deliver fires into this conversation thread. Use "current" to attach to the calling conversation. Omit for isolated threadless runs.',
      ),
    resourceId: z
      .string()
      .optional()
      .describe(
        'Resource id for threaded schedules. Required when you pass a threadId other than "current".',
      ),
    signalType: z
      .enum(["user", "state", "reactive", "notification", "user-message", "system-reminder"])
      .optional()
      .describe("Signal category used for threaded fires. Defaults to `notification`."),
    tagName: z
      .string()
      .optional()
      .describe("XML tag the signal renders as. Defaults to `schedule`."),
    ifActive: z
      .object({
        behavior: z.enum(["deliver", "persist", "discard"]).optional(),
      })
      .optional()
      .describe("Behavior when the target thread is streaming. Threaded schedules only."),
    ifIdle: z
      .object({
        behavior: z.enum(["wake", "persist", "discard"]).optional(),
      })
      .optional()
      .describe("Behavior when the target thread is idle. Threaded schedules only."),
    status: z
      .enum(["active", "paused"])
      .optional()
      .describe("Initial lifecycle status. Defaults to `active`."),
    metadata: z.record(z.string(), z.unknown()).optional().describe("Arbitrary metadata to store."),
  }),
  outputSchema: scheduleViewSchema,
  execute: async (input, context) => {
    const schedules = getSchedules(context);
    const agentId = input.agentId ?? context.agent?.agentId;

    if (!agentId) {
      throw new Error(missingAgentId);
    }

    const attachToCurrentThread = input.threadId === "current";
    const threadId = attachToCurrentThread ? context.agent?.threadId : input.threadId;
    const resourceId = attachToCurrentThread
      ? (input.resourceId ?? context.agent?.resourceId)
      : input.resourceId;

    if (attachToCurrentThread && !threadId) {
      throw new Error(
        'No active thread is available to attach the schedule to. Pass an explicit threadId, or omit threadId for a threadless schedule.',
      );
    }

    if (threadId && !resourceId) {
      throw new Error(
        "Threaded schedules require a resourceId alongside threadId. Pass resourceId explicitly.",
      );
    }

    if (!threadId && (input.ifActive || input.ifIdle)) {
      throw new Error("ifActive and ifIdle only apply to threaded schedules. Pass a threadId.");
    }

    const schedule = await schedules.create({
      agentId,
      id: input.id,
      cron: input.cron,
      timezone: input.timezone,
      prompt: input.prompt,
      name: input.name,
      threadId,
      resourceId,
      signalType: input.signalType,
      tagName: input.tagName,
      ifActive: input.ifActive,
      ifIdle: input.ifIdle,
      status: input.status,
      metadata: input.metadata,
    });

    return toScheduleView(schedule);
  },
});

export const listSchedulesTool = createTool({
  id: "schedule_list",
  description:
    "List persisted schedules. Filters combine with AND. Completed schedules are hidden unless you explicitly filter for status `completed`.",
  inputSchema: z.object({
    agentId: z.string().optional().describe("Only schedules for this agent."),
    threadId: z.string().optional().describe("Only schedules that deliver into this thread."),
    resourceId: z.string().optional().describe("Only schedules attributed to this resource."),
    name: z.string().optional().describe("Only schedules with this label."),
    status: scheduleStatusSchema
      .optional()
      .describe("Only schedules with this status. Required to see completed schedules."),
  }),
  outputSchema: z.object({
    schedules: z.array(scheduleViewSchema),
    count: z.number(),
  }),
  execute: async (input, context) => {
    const schedules = getSchedules(context);
    const results = await schedules.list({
      agentId: input.agentId,
      threadId: input.threadId,
      resourceId: input.resourceId,
      name: input.name,
      status: input.status,
    });

    return { schedules: results.map(toScheduleView), count: results.length };
  },
});

export const getScheduleTool = createTool({
  id: "schedule_get",
  description: "Fetch a single schedule by id. Bare ids resolve to their `agent_<slug>` form.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id, for example `agent_nightly-summary` or `nightly-summary`."),
  }),
  outputSchema: scheduleViewSchema,
  execute: async ({ id }, context) => {
    const schedules = getSchedules(context);
    const schedule = await schedules.get(id);

    if (!schedule) {
      throw new Error(`No schedule found with id "${id}".`);
    }

    return toScheduleView(schedule);
  },
});

export const updateScheduleTool = createTool({
  id: "schedule_update",
  description:
    "Update a schedule's cadence or content. Changing cron or timezone recomputes the next fire time. threadId and resourceId cannot be changed; create a new schedule instead. Use schedule_pause or schedule_resume for lifecycle changes.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id to update."),
    cron: z.string().optional().describe("New cron expression."),
    timezone: z.string().optional().describe("New IANA timezone."),
    prompt: z.string().optional().describe("New prompt sent on every fire."),
    name: z.string().optional().describe("New label."),
    signalType: z
      .enum(["user", "state", "reactive", "notification", "user-message", "system-reminder"])
      .optional()
      .describe("New signal category for threaded fires."),
    tagName: z.string().optional().describe("New XML tag for the signal."),
    status: z
      .enum(["active", "paused"])
      .optional()
      .describe("Patch the lifecycle status directly. Prefer schedule_pause / schedule_resume."),
    metadata: z.record(z.string(), z.unknown()).optional().describe("Replacement metadata."),
  }),
  outputSchema: scheduleViewSchema,
  execute: async ({ id, ...patch }, context) => {
    const schedules = getSchedules(context);

    if (Object.values(patch).every((value) => value === undefined)) {
      throw new Error("Nothing to update. Pass at least one field to change.");
    }

    return toScheduleView(await schedules.update(id, patch));
  },
});

export const pauseScheduleTool = createTool({
  id: "schedule_pause",
  description: "Pause a schedule so it stops firing. Pausing is durable and idempotent.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id to pause."),
  }),
  outputSchema: scheduleViewSchema,
  execute: async ({ id }, context) => {
    const schedules = getSchedules(context);
    return toScheduleView(await schedules.pause(id));
  },
});

export const resumeScheduleTool = createTool({
  id: "schedule_resume",
  description:
    "Resume a paused schedule. The next fire time is recomputed from now, so a long-paused schedule does not replay missed fires. A schedule with no future occurrence is completed instead of resumed.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id to resume."),
  }),
  outputSchema: scheduleViewSchema,
  execute: async ({ id }, context) => {
    const schedules = getSchedules(context);
    return toScheduleView(await schedules.resume(id));
  },
});

export const runScheduleTool = createTool({
  id: "schedule_run",
  description:
    "Fire a schedule once immediately, off-cadence, without changing its stored cron. Works on paused schedules.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id to fire now."),
  }),
  outputSchema: z.object({
    scheduleId: z.string(),
    claimId: z.string(),
    scheduledFireAt: z.string().describe("ISO 8601 timestamp of this manual fire"),
  }),
  execute: async ({ id }, context) => {
    const schedules = getSchedules(context);
    const run = await schedules.run(id);

    return {
      scheduleId: run.scheduleId,
      claimId: run.claimId,
      scheduledFireAt: toIso(run.scheduledFireAt)!,
    };
  },
});

export const deleteScheduleTool = createTool({
  id: "schedule_delete",
  description:
    "Delete a schedule and its trigger history. Deleting a missing schedule is a no-op.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id to delete."),
  }),
  outputSchema: z.object({
    id: z.string(),
    deleted: z.boolean(),
  }),
  execute: async ({ id }, context) => {
    const schedules = getSchedules(context);
    await schedules.delete(id);
    return { id, deleted: true };
  },
});

export const listScheduleTriggersTool = createTool({
  id: "schedule_triggers",
  description:
    "List the fire history for a schedule, newest first. Each entry records the scheduled and actual fire time, the outcome, the resulting run id, and any error.",
  inputSchema: z.object({
    id: z.string().describe("Schedule id whose trigger history to read."),
    limit: z.number().int().positive().max(200).optional().describe("Maximum entries to return."),
  }),
  outputSchema: z.object({
    triggers: z.array(
      z.object({
        id: z.string().optional(),
        runId: z.string().nullable(),
        scheduledFireAt: z.string().describe("ISO 8601 timestamp"),
        actualFireAt: z.string().describe("ISO 8601 timestamp"),
        outcome: z.string(),
        triggerKind: z.string().optional(),
        error: z.string().optional(),
      }),
    ),
    count: z.number(),
  }),
  execute: async ({ id, limit }, context) => {
    const storage = context.mastra?.getStorage();
    const store = await storage?.getStore("schedules");

    if (!store) {
      throw new Error(
        "This Mastra storage adapter does not implement the schedules domain, so trigger history is unavailable.",
      );
    }

    const triggers = await store.listTriggers(id, { limit });

    return {
      triggers: triggers.map((trigger) => ({
        id: trigger.id,
        runId: trigger.runId,
        scheduledFireAt: toIso(trigger.scheduledFireAt)!,
        actualFireAt: toIso(trigger.actualFireAt)!,
        outcome: trigger.outcome,
        triggerKind: trigger.triggerKind,
        error: trigger.error,
      })),
      count: triggers.length,
    };
  },
});

export const scheduleTools = {
  createScheduleTool,
  listSchedulesTool,
  getScheduleTool,
  updateScheduleTool,
  pauseScheduleTool,
  resumeScheduleTool,
  runScheduleTool,
  deleteScheduleTool,
  listScheduleTriggersTool,
};
