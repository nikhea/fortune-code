import { agentControllerMessageText } from "@mastra/client-js";
import { useTerminalDimensions } from "@opentui/react";
import { useCallback, useMemo } from "react";
import type { MastraDBMessage } from "@mastra/client-js";

import { ChatMessage } from "@/components/ui/chat-message";
import type { ChatRole } from "@/components/ui/chat-message";
import { TextInput } from "@/components/ui/text-input";
import { ModeSwitcher } from "@/components/mode-switcher";
import { SlashCommandMenu } from "@/components/slash-command-menu";
import { useMessages, useSessionStream } from "@/hooks/use-agent";
import { useSlashCommands } from "@/hooks/use-slash-commands";
import { useTheme } from "@/hooks/use-theme";
import { matchSlashCommands, parseSlashDraft } from "@/lib/slash-commands";
import type { AgentConnection } from "@/lib/connection";
import { useComposerStore } from "@/store/composer";
import type { ComposerNotice } from "@/store/composer";
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

/** The notices of a tab, so the selector keeps the same array every time. */
const NO_NOTICES: ComposerNotice[] = [];

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

  const draft = useComposerStore((state) => state.drafts[tab.id] ?? "");
  const setDraft = useComposerStore((state) => state.setDraft);
  const slashIndex = useComposerStore((state) => state.slashIndexes[tab.id] ?? 0);
  const setSlashIndex = useComposerStore((state) => state.setSlashIndex);
  const notices = useComposerStore(
    (state) => state.notices[tab.id] ?? NO_NOTICES,
  );
  const addNotice = useComposerStore((state) => state.addNotice);

  const commands = useSlashCommands({ connection, tab });

  const onStatus = useCallback(
    (status: "streaming" | "idle") => {
      updateTab(tab.id, {
        status: status === "streaming" ? "streaming" : "ready",
      });
    },
    [updateTab, tab.id],
  );

  useSessionStream(connection, tab.sessionId, tab.threadId, onStatus);

  // A draft that starts with a slash is a command. The name is what comes
  // before the first space, and the rest is the argument.
  const parsed = useMemo(() => parseSlashDraft(draft), [draft]);
  const matches = useMemo(
    () => (parsed ? matchSlashCommands(commands, parsed.name) : []),
    [commands, parsed],
  );
  const activeIndex = Math.min(slashIndex, Math.max(0, matches.length - 1));

  const send = async (text: string) => {
    const content = text.trim();

    if (!content) {
      return;
    }

    // The draft is what the menu matched, so the command that runs is the
    // one that was highlighted.
    const command = parsed ? matches[activeIndex] : undefined;

    if (parsed && command) {
      setDraft(tab.id, "");
      setSlashIndex(tab.id, 0);

      try {
        const lines = await command.run(parsed.args);

        if (lines.length > 0) {
          addNotice(tab.id, lines.join("\n"));
        }
      } catch (error) {
        addNotice(
          tab.id,
          error instanceof Error ? error.message : String(error),
        );
      }

      return;
    }

    setDraft(tab.id, "");
    updateTab(tab.id, { status: "streaming" });

    // The session may be gone after a server restart, so it is brought back
    // before the message goes out.
    const session = await connection.liveSession(tab.sessionId, tab.threadId);

    await session.sendMessage(content);
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="column" flexGrow={1}>
        {messages.length === 0 && notices.length === 0 && (
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
        {notices.map((notice) => (
          <ChatMessage key={notice.id} sender="system">
            {notice.text}
          </ChatMessage>
        ))}
      </box>
      <ModeSwitcher connection={connection} tab={tab} />
      {parsed && (
        <SlashCommandMenu
          commands={matches}
          activeIndex={activeIndex}
          onActiveIndexChange={(index) => setSlashIndex(tab.id, index)}
        />
      )}
      <TextInput
        value={draft}
        onChange={(text) => setDraft(tab.id, text)}
        onSubmit={(text) => void send(text)}
        placeholder="Ask the agent…"
        width={Math.max(20, width - 6)}
      />
    </box>
  );
};
