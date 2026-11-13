import { createTool } from "@mastra/core/tools";
import { z } from "zod";

type WorkflowLike = {
  id?: string;
  description?: string;
  origin?: "code" | "dynamic";
  steps?: Record<string, { id?: string; description?: string }>;
  createRun?: () => Promise<{
    start: (args: { inputData: unknown }) => Promise<{
      status: string;
      result?: unknown;
    }>;
  }>;
};

function getMastra(context: { mastra?: any } | undefined) {
  const mastra = context?.mastra;

  if (!mastra) {
    throw new Error(
      "Workflow tools require a running Mastra instance. Run them from a Mastra agent or server, not standalone.",
    );
  }

  return mastra;
}

function resolveWorkflow(mastra: any, id: string): WorkflowLike | undefined {
  const workflows = (mastra.listWorkflows?.() ?? {}) as Record<string, WorkflowLike>;

  return (
    workflows[id] ??
    Object.values(workflows).find(
      (workflow) => workflow.id === id,
    )
  );
}

const jsonSchemaSchema = z
  .record(z.string(), z.unknown())
  .describe("JSON Schema for the workflow input or output.");

const stepSchema = z
  .object({
    type: z
      .enum(["tool", "agent"])
      .describe("The kind of step: a registered tool or a registered agent."),
    id: z.string().describe("Step id, unique inside the workflow."),
    toolId: z
      .string()
      .optional()
      .describe("Registered tool id. Required when type is `tool`."),
    agentId: z
      .string()
      .optional()
      .describe("Registered agent id. Required when type is `agent`."),
    description: z.string().optional(),
  })
  .describe("One step of the workflow graph.");

/** Lists the workflows registered on the running Mastra instance. */
export const listWorkflowsTool = createTool({
  id: "list-workflows",
  description:
    "List the workflows registered on this server. Use it to find a workflow id before reading or running one.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    workflows: z.array(
      z.object({
        id: z.string(),
        description: z.string().optional(),
        origin: z.string().optional(),
        steps: z.array(z.string()),
      }),
    ),
    count: z.number(),
  }),
  execute: async (_input, context) => {
    const mastra = getMastra(context);
    const workflows = (mastra.listWorkflows?.() ?? {}) as Record<
      string,
      WorkflowLike
    >;

    const list = Object.entries(workflows).map(([key, workflow]) => ({
      id: workflow.id ?? key,
      description: workflow.description,
      origin: workflow.origin,
      steps: Object.keys(workflow.steps ?? {}),
    }));

    return { workflows: list, count: list.length };
  },
});

/** Describes one workflow: its steps and its input and output shapes. */
export const getWorkflowTool = createTool({
  id: "get-workflow",
  description:
    "Describe one registered workflow: its steps, its origin, and the shape of its input and output.",
  inputSchema: z.object({
    id: z.string().describe("Workflow id, as listed by list-workflows."),
  }),
  outputSchema: z.object({
    id: z.string(),
    description: z.string().optional(),
    origin: z.string().optional(),
    steps: z.array(
      z.object({
        id: z.string(),
        description: z.string().optional(),
      }),
    ),
    found: z.boolean(),
  }),
  execute: async ({ id }, context) => {
    const mastra = getMastra(context);
    const workflow = resolveWorkflow(mastra, id);

    if (!workflow) {
      return { id, steps: [], found: false };
    }

    return {
      id: workflow.id ?? id,
      description: workflow.description,
      origin: workflow.origin,
      steps: Object.entries(workflow.steps ?? {}).map(([stepId, step]) => ({
        id: step.id ?? stepId,
        description: step.description,
      })),
      found: true,
    };
  },
});

/** Registers a workflow from a JSON graph, so it can be run like any other. */
export const createWorkflowTool = createTool({
  id: "create-workflow",
  description:
    "Create a workflow from a JSON definition. The graph steps reference a registered tool or agent by id. The workflow is persisted and becomes runnable.",
  inputSchema: z.object({
    id: z.string().describe("Workflow id, unique on this server."),
    description: z.string().optional(),
    inputSchema: jsonSchemaSchema,
    outputSchema: jsonSchemaSchema,
    graph: z.array(stepSchema).min(1),
  }),
  outputSchema: z.object({
    id: z.string(),
    created: z.boolean(),
    message: z.string(),
  }),
  execute: async (input, context) => {
    const mastra = getMastra(context);

    await mastra.addDynamicWorkflow({
      id: input.id,
      description: input.description,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      graph: input.graph as any,
    });

    return {
      id: input.id,
      created: true,
      message: `Workflow ${input.id} created.`,
    };
  },
});

/** Runs a registered workflow and waits for its result. */
export const runWorkflowTool = createTool({
  id: "run-workflow",
  description:
    "Run a registered workflow with the given input and return its result. Use list-workflows to find the id and get-workflow to check the input shape.",
  inputSchema: z.object({
    id: z.string().describe("Workflow id, as listed by list-workflows."),
    input: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Workflow input. Defaults to an empty object."),
  }),
  outputSchema: z.object({
    id: z.string(),
    status: z.string(),
    result: z.unknown().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ id, input }, context) => {
    const mastra = getMastra(context);
    const workflow = resolveWorkflow(mastra, id);

    if (!workflow?.createRun) {
      return {
        id,
        status: "failed",
        error: `No workflow found with id "${id}".`,
      };
    }

    const run = await workflow.createRun();
    const result = await run.start({ inputData: input ?? {} });

    return {
      id,
      status: result.status,
      result: result.result,
    };
  },
});

/** Removes a workflow and its persisted definition. */
export const deleteWorkflowTool = createTool({
  id: "delete-workflow",
  description:
    "Delete a workflow: it is unregistered from this server and its persisted definition is removed.",
  inputSchema: z.object({
    id: z.string().describe("Workflow id, as listed by list-workflows."),
  }),
  outputSchema: z.object({
    id: z.string(),
    deleted: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ id }, context) => {
    const mastra = getMastra(context);
    const removed = mastra.removeWorkflow?.(id) ?? false;

    const store = await mastra.getStorage?.()?.getStore?.("workflowDefinitions");
    await store?.delete?.(id);

    return {
      id,
      deleted: removed,
      message: removed
        ? `Workflow ${id} deleted.`
        : `No workflow found with id "${id}".`,
    };
  },
});
