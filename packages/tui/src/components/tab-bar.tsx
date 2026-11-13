import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

import { TabbedContent } from "@/components/ui/tabbed-content";
import { useTheme } from "@/hooks/use-theme";
import type { Tab } from "@/store/tabs";

export interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
  /** Opens another tab. */
  onNewTab: () => void;
  /** The content of a tab. Only the active tab is mounted. */
  renderContent: (tab: Tab) => ReactNode;
}

/**
 * The tab bar.
 *
 * Every tab is a session of its own, so the bar is also the session switcher.
 * The arrow keys are left to the composer, which moves the cursor with them,
 * so the tabs switch on Tab and Ctrl+Tab, and Ctrl+T opens another one.
 * Shift+Tab belongs to the mode, which walks through the modes.
 */
export const TabBar = ({
  tabs,
  activeTabId,
  onTabChange,
  onNewTab,
  renderContent,
}: TabBarProps) => {
  const theme = useTheme();

  useKeyboard((key) => {
    if (key.ctrl && key.name === "t") {
      onNewTab();
      return;
    }

    if (key.name !== "tab" || key.shift) {
      return;
    }

    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    const next = key.ctrl
      ? tabs[(index - 1 + tabs.length) % tabs.length]
      : tabs[(index + 1) % tabs.length];

    if (next && next.id !== activeTabId) {
      onTabChange(next.id);
    }
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <TabbedContent
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.mode ? `${tab.title} · ${tab.mode}` : tab.title,
          content: renderContent(tab),
        }))}
        activeTab={activeTabId ?? undefined}
        onChange={onTabChange}
        tabBarStyle="underline"
        keyboardNavigation={false}
        fill
      />
      <text fg={theme.colors.mutedForeground}>
        {"Tab: next tab · ctrl+t: new tab · shift+tab: mode · F1/F2/F3: mode · ctrl+c: quit"}
      </text>
    </box>
  );
};
