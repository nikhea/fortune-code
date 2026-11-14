import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type {
  AgentControllerEvent,
  MastraDBMessage,
} from "@mastra/client-js";
import { isKnownAgentControllerEvent } from "@mastra/client-js";
import type { AgentConnection } from "@/lib/connection";

export const queryKeys = {
  modes: ["agent-controller", "modes"] as const,
  threads: (sessionId: string) => ["agent-controller", "threads", sessionId] as const,
  messages: (sessionId: string, threadId: string) =>
    ["agent-controller", "messages", sessionId, threadId] as const,
  sessionState: (sessionId: string) =>
    ["agent-controller", "session-state", sessionId] as const,
};

/** The modes the controller runs in: build, plan, explore. */
export const useModes = (connection: AgentConnection) =>
  useQuery({
    queryKey: queryKeys.modes,
    queryFn: () => connection.controller.listModes(),
  });

/**
 * The threads of the project. The threads are scoped by the project tag, so
 * another worktree of the same repository does not show up here.
 */
export const useThreads = (connection: AgentConnection, sessionId: string) =>
  useQuery({
    queryKey: queryKeys.threads(sessionId),
    queryFn: async () => {
      const session = await connection.liveSession(sessionId);

      return session.listThreads({ tags: { projectPath: connection.resourceId } });
    },
  });

/** The messages of one thread. */
export const useMessages = (
  connection: AgentConnection,
  sessionId: string,
  threadId: string,
) =>
  useQuery({
    queryKey: queryKeys.messages(sessionId, threadId),
    queryFn: async () => {
      const session = await connection.liveSession(sessionId, threadId);

      return session.listMessages(threadId, 200);
    },
  });

/** The mode, the model, and the thread of one session. */
export const useSessionState = (
  connection: AgentConnection,
  sessionId: string,
) =>
  useQuery({
    queryKey: queryKeys.sessionState(sessionId),
    queryFn: async () => {
      const session = await connection.liveSession(sessionId);

      return session.state();
    },
  });

/**
 * Switches the mode of a session: build, plan, or explore.
 *
 * The mode belongs to the session, so every tab switches on its own.
 */
export const useSwitchMode = (
  connection: AgentConnection,
  sessionId: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modeId: string) => {
      const session = await connection.liveSession(sessionId);

      return session.switchMode(modeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessionState(sessionId),
      });
    },
  });
};

/**
 * Appends a streamed text delta to a message.
 */
export function applyDelta(
  message: MastraDBMessage,
  delta: string,
): MastraDBMessage {
  const parts = [...(message.content?.parts ?? [])];
  const last = parts.at(-1);

  if (last && last.type === "text") {
    parts[parts.length - 1] = { ...last, text: `${last.text ?? ""}${delta}` };
  } else {
    parts.push({ type: "text", text: delta });
  }

  return { ...message, content: { ...message.content, parts } };
}

/**
 * Folds a streamed event into the list of messages.
 *
 * Returns the new list, or null when the event does not change the messages.
 */
export function reduceMessages(
  messages: MastraDBMessage[],
  event: AgentControllerEvent,
): MastraDBMessage[] | null {
  if (!isKnownAgentControllerEvent(event)) {
    return null;
  }

  if (event.type === "message_start") {
    const message = event.message;

    return messages.some((entry) => entry.id === message.id)
      ? null
      : [...messages, message];
  }

  if (event.type === "message_update") {
    const update = event.event;

    if (update.type !== "text-delta" || !update.delta) {
      return null;
    }

    let changed = false;
    const next = messages.map((message) => {
      if (message.id !== event.id) {
        return message;
      }
      changed = true;
      return applyDelta(message, update.delta);
    });

    return changed ? next : null;
  }

  return null;
}

/**
 * Subscribes to a session's event stream and keeps the message cache in
 * step with it.
 *
 * The server does not replay the events missed while the stream was down, so
 * a reconnect re-reads the messages instead of trusting the cache.
 */
export const useSessionStream = (
  connection: AgentConnection,
  sessionId: string,
  threadId: string,
  onStatus?: (status: "streaming" | "idle") => void,
) => {
  const queryClient = useQueryClient();
  const statusRef = useRef(onStatus);

  // The callback is read through a ref, so a new function on every render
  // does not tear the subscription down.
  statusRef.current = onStatus;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const key = queryKeys.messages(sessionId, threadId);

    const handleEvent = (event: AgentControllerEvent) => {
      const next = reduceMessages(
        queryClient.getQueryData<MastraDBMessage[]>(key) ?? [],
        event,
      );

      if (next) {
        queryClient.setQueryData<MastraDBMessage[]>(key, next);
      }

      if (event.type === "message_start" || event.type === "message_update") {
        statusRef.current?.("streaming");
        return;
      }

      if (event.type === "agent_end") {
        statusRef.current?.("idle");
        return;
      }

      if (event.type === "tool_approval_required") {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const start = async () => {
      const subscription = await connection.session(sessionId).subscribe({
        onEvent: handleEvent,
        onError: () => {
          statusRef.current?.("idle");
        },
        onReconnect: () => {
          // The gap is not replayed, so the cache is re-read.
          queryClient.invalidateQueries({ queryKey: key });
        },
        reconnect: true,
      });

      if (cancelled) {
        subscription.unsubscribe();
        return;
      }

      unsubscribe = subscription.unsubscribe;
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [connection, sessionId, threadId, queryClient]);
};
