import { agentControllerMessageText } from "@mastra/client-js";
import { useTerminalDimensions } from "@opentui/react";
import { useCallback, useState } from "react";
import type { MastraDBMessage } from "@mastra/client-js";

import { ChatMessage } from "@/components/ui/chat-message";
import type { ChatRole } from "@/components/ui/chat-message";
import { TextInput } from "@/components/ui/text-input";
import { ModeSwitcher } from "@/components/mode-switcher";
import { useMessages, useSessionStream } from "@/hooks/use-agent";
import { useTheme } from "@/hooks/use-theme";
import type { AgentConnection } from "@/lib/connection";
import { useTabsStore } from "@/store/tabs";
import type { Tab } from "@/store/tabs";

export interface ChatViewProps {
  connection: AgentConnection;
  tab: Tab;
}

/**
 * The role of a message. A message the user sent arrives with the role
 * `signal` and the type `user`, so the type is what decides.
 */
const roleOf = (message: MastraDBMessage): ChatRole => {
  const kind = message.type ?? message.role;

  if (kind === "user") return "user";
  if (kind === "assistant") return "assistant";
  return "system";
};

/** The error a message carries, if it failed. */
const errorOf = (message: MastraDBMessage): string | undefined => {
  for (const part of message.content?.parts ?? []) {
    if (part.type === "error") {
      return part.error?.message;
    }
  }

  return undefined;
};

/**
 * The conversation of one tab. A tab shows one thread of one session, so
 * switching tabs switches the conversation.
 */
export const ChatView = ({ connection, tab }: ChatViewProps) => {
  const theme = useTheme();
  const { width } = useTerminalDimensions();
  const updateTab = useTabsStore((state) => state.updateTab);
  const { data: messages = [] } = useMessages(
    connection,
    tab.sessionId,
    tab.threadId,
  );
  const [draft, setDraft] = useState("");

  const onStatus = useCallback(
    (status: "streaming" | "idle") => {
      updateTab(tab.id, {
        status: status === "streaming" ? "streaming" : "ready",
      });
    },
    [updateTab, tab.id],
  );

  useSessionStream(connection, tab.sessionId, tab.threadId, onStatus);

  const send = async (text: string) => {
    const content = text.trim();

    if (!content) {
      return;
    }

    setDraft("");
    updateTab(tab.id, { status: "streaming" });

    // The session may be gone after a server restart, so it is brought back
    // before the message goes out.
    const session = await connection.liveSession(tab.sessionId, tab.threadId);

    await session.sendMessage(content);
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="column" flexGrow={1}>
        {messages.length === 0 && (
          <text fg={theme.colors.mutedForeground}>
            {"Nothing here yet. Say something to start."}
          </text>
        )}
        {messages.map((message) => {
          const error = errorOf(message);

          return (
            <ChatMessage
              key={message.id}
              sender={error ? "error" : roleOf(message)}
              timestamp={
                message.createdAt ? new Date(message.createdAt) : undefined
              }
            >
              {error ?? agentControllerMessageText(message)}
            </ChatMessage>
          );
        })}
      </box>
      <ModeSwitcher connection={connection} tab={tab} />
      <TextInput
        value={draft}
        onChange={setDraft}
        onSubmit={(text) => void send(text)}
        placeholder="Ask the agent…"
        width={Math.max(20, width - 6)}
      />
    </box>
  );
};
