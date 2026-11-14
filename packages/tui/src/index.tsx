import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatView } from "@/components/chat-view";
import { TabBar } from "@/components/tab-bar";
import { StatusMessage } from "@/components/ui/status-message";
import { ThemeProvider } from "@/providers/theme-provider";
import { useAutoCopySelection } from "@/hooks/use-auto-copy";
import { useModes } from "@/hooks/use-agent";
import { createConnection } from "@/lib/connection";
import { useTabsStore } from "@/store/tabs";
import type { Tab } from "@/store/tabs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The agent is the source of truth, and the TUI talks to it over HTTP.
      staleTime: 5_000,
      retry: 1,
    },
  },
});

function App() {
  // The project the TUI runs in is the resource: every tab works on it.
  const connection = useMemo(() => createConnection({ resourceId: process.cwd() }), []);

  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const openTab = useTabsStore((state) => state.openTab);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);

  // The modes of the controller, so every tab can name and color its mode.
  const { data: modes = [] } = useModes(connection);

  // Highlighting text copies it, and the app says so.
  const [copied, setCopied] = useState<string | null>(null);

  useAutoCopySelection((text) => {
    setCopied(`${text.length} characters copied`);

    setTimeout(() => setCopied(null), 2000);
  });

  const createTab = useCallback(
    async (title?: string) => {
      try {
        const session = await connection.openTab(title);
        const tab: Tab = {
          id: session.sessionId,
          sessionId: session.sessionId,
          threadId: session.threadId,
          title: session.title,
          status: "ready",
        };
        openTab(tab);
      } catch (error) {
        openTab({
          id: `failed-${Date.now()}`,
          sessionId: "",
          threadId: "",
          title: "Connection failed",
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [connection, openTab],
  );

  useEffect(() => {
    // The renderer mounts the tree again once it settles, so the first tab is
    // only opened when there is none yet.
    if (useTabsStore.getState().tabs.length > 0) {
      return;
    }

    void createTab();
  }, [createTab]);

  return (
    <box flexDirection="column" flexGrow={1}>
      {tabs.length === 0 ? (
        <text>{"Connecting to the agent…"}</text>
      ) : (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          modes={modes}
          onTabChange={setActiveTab}
          onNewTab={() => void createTab()}
          renderContent={(tab) =>
            tab.status === "error" ? (
              <text fg="#f00">{tab.error ?? "The tab could not be opened."}</text>
            ) : (
              <ChatView connection={connection} tab={tab} />
            )
          }
        />
      )}
      {copied && (
        <box flexDirection="row" gap={1}>
          <StatusMessage variant="success">{copied}</StatusMessage>
        </box>
      )}
    </box>
  );
}

const renderer = await createCliRenderer();

createRoot(renderer).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </QueryClientProvider>,
);
