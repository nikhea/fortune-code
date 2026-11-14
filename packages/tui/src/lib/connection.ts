import { MastraClient } from "@mastra/client-js";
import { randomUUID } from "node:crypto";
import { basename } from "node:path";

export const DEFAULT_BASE_URL = "http://localhost:4111";
/**
 * The key the controller is registered under in `new Mastra({ agentControllers })`,
 * which is not the controller's own id.
 */
export const DEFAULT_CONTROLLER_ID = "codingAgentController";

export type ConnectionOptions = {
  /** Where the agent server runs. */
  baseUrl?: string;
  /** The controller to talk to. */
  controllerId?: string;
  /**
   * The project path. It is the resource id: the scope every thread, every
   * memory record, and every session of this project belongs to.
   */
  resourceId: string;
};

export type TabSession = {
  sessionId: string;
  threadId: string;
  title: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A session id for a new tab. It carries the project it belongs to, so an id
 * that turns up in a log still says where it came from, and the random part
 * keeps two tabs of the same project apart.
 */
export function generateSessionId(resourceId: string): string {
  const slug = slugify(basename(resourceId)) || "project";
  return `${slug}-${randomUUID().slice(0, 8)}`;
}

/**
 * The TUI's connection to the agent.
 *
 * The controller holds one conversation per session, and a session works on
 * one resource. So the connection is scoped to a project, and every tab opens
 * its own session with its own thread on that resource.
 */
export class AgentConnection {
  readonly client: MastraClient;
  readonly controller: ReturnType<MastraClient["getAgentController"]>;
  readonly resourceId: string;

  constructor({ baseUrl, controllerId, resourceId }: ConnectionOptions) {
    this.client = new MastraClient({
      baseUrl: baseUrl ?? process.env.MASTRA_URL ?? DEFAULT_BASE_URL,
    });
    this.controller = this.client.getAgentController(
      controllerId ??
        process.env.MASTRA_CONTROLLER_ID ??
        DEFAULT_CONTROLLER_ID,
    );
    this.resourceId = resourceId;
  }

  /** The client session for a session id. */
  session(sessionId: string) {
    return this.controller.session(sessionId);
  }

  /**
   * Opens a tab: its own session on the resource, with its own thread.
   *
   * The session id is generated, so two tabs never share a run loop, a mode,
   * or a model. The thread is tagged with the project, so several worktrees
   * of the same repository do not see each other's threads.
   */
  async openTab(title?: string): Promise<TabSession> {
    const sessionId = generateSessionId(this.resourceId);
    const session = this.session(sessionId);

    await session.create({
      resourceId: this.resourceId,
      tags: { projectPath: this.resourceId },
    });

    const thread = await session.createThread(title ?? "New tab");

    return {
      sessionId,
      threadId: thread.id,
      title: thread.title ?? title ?? "New tab",
    };
  }
}

/**
 * The connection for the project the TUI was started in.
 */
export function createConnection(
  options: Partial<ConnectionOptions> & { resourceId?: string } = {},
): AgentConnection {
  return new AgentConnection({
    baseUrl: options.baseUrl,
    controllerId: options.controllerId,
    resourceId: options.resourceId ?? process.cwd(),
  });
}
