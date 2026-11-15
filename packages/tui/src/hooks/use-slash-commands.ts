import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  modelsQuery,
  threadsQuery,
  useCreateThread,
  useModes,
  useSessionState,
  useSwitchMode,
  useSwitchModel,
} from "@/hooks/use-agent";
import type { AgentConnection } from "@/lib/connection";
import { describeSlashCommand } from "@/lib/slash-commands";
import type { SlashCommand } from "@/lib/slash-commands";
import { useComposerStore } from "@/store/composer";
import { useTabsStore } from "@/store/tabs";
import type { Tab } from "@/store/tabs";

export interface SlashCommandContext {
  connection: AgentConnection;
  tab: Tab;
}

/**
 * The slash commands of the composer.
 *
 * Every command runs in the client, so it answers without a model turn. The
 * commands that change the session call the same API the TUI already uses, so
 * the tab and the session stay in step.
 */
export const useSlashCommands = ({
  connection,
  tab,
}: SlashCommandContext): SlashCommand[] => {
  const queryClient = useQueryClient();
  const modes = useModes(connection);
  const state = useSessionState(connection, tab.sessionId);
  const switchMode = useSwitchMode(connection, tab.sessionId);
  const switchModel = useSwitchModel(connection, tab.sessionId);
  const createThread = useCreateThread(connection, tab.sessionId);
  const updateTab = useTabsStore((store) => store.updateTab);
  const clearNotices = useComposerStore((store) => store.clearNotices);

  return useMemo<SlashCommand[]>(() => {
    const commands: SlashCommand[] = [];

    // The help command lists the commands, so it reads the list it lives in.
    commands.push({
      name: "help",
      description: "List the commands.",
      run: async () => commands.map(describeSlashCommand),
    });

    commands.push({
      name: "mode",
      description: "Switch the mode of this tab.",
      argument: "[mode]",
      run: async (args) => {
        const target = args.trim().toLowerCase();
        const list = modes.data ?? [];

        if (!target) {
          return list.length
            ? list.map(
                (mode) =>
                  `${mode.id}${mode.id === state.data?.modeId ? " (current)" : ""}`,
              )
            : ["No modes are available."];
        }

        const mode = list.find(
          (entry) =>
            entry.id.toLowerCase() === target ||
            entry.name?.toLowerCase() === target,
        );

        if (!mode) {
          return [`There is no mode named "${args.trim()}".`];
        }

        await switchMode.mutateAsync(mode.id);

        return [`Mode: ${mode.id}`];
      },
    });

    commands.push({
      name: "model",
      description: "Switch the model of this tab.",
      argument: "[model]",
      run: async (args) => {
        const target = args.trim();
        // The catalog is only fetched when the command runs, so a tab that
        // never switches models never asks for it.
        const list = await queryClient.fetchQuery(modelsQuery(connection));

        if (!target) {
          return list.length
            ? list.map(
                (model) =>
                  `${model.id}${model.id === state.data?.modelId ? " (current)" : ""}`,
              )
            : ["No models are available."];
        }

        const model = list.find((entry) => entry.id === target);

        if (!model) {
          return [`There is no model named "${target}".`];
        }

        await switchModel.mutateAsync(model.id);

        return [`Model: ${model.id}`];
      },
    });

    commands.push({
      name: "threads",
      description: "List the threads of this project.",
      run: async () => {
        const list = await queryClient.fetchQuery(
          threadsQuery(connection, tab.sessionId),
        );

        return list.length
          ? list.map(
              (thread) =>
                `${thread.title ?? "(untitled)"}${thread.id === tab.threadId ? " (current)" : ""} — ${thread.id}`,
            )
          : ["There are no threads yet."];
      },
    });

    commands.push({
      name: "clear",
      description: "Start a new thread in this tab.",
      argument: "[title]",
      run: async (args) => {
        const title = args.trim() || "New thread";
        const thread = await createThread.mutateAsync(title);

        // The session follows the new thread, and so does the tab, so both
        // read the same conversation. The notices belonged to the old one.
        updateTab(tab.id, { threadId: thread.id, title });
        clearNotices(tab.id);

        return [`New thread: ${title}`];
      },
    });

    return commands;
  }, [
    queryClient,
    connection,
    modes.data,
    state.data?.modeId,
    state.data?.modelId,
    tab.id,
    tab.threadId,
    switchMode,
    switchModel,
    createThread,
    updateTab,
    clearNotices,
  ]);
};
