import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

import { TabbedContent } from "@/components/ui/tabbed-content";
import { useTheme } from "@/hooks/use-theme";
import type { Tab } from "@/store/tabs";

export interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
  /** The content of a tab. Only the active tab is mounted. */
  renderContent: (tab: Tab) => ReactNode;
}

/**
 * The tab bar.
 *
 * Every tab is a session of its own, so the bar is also the session switcher.
 * The arrow keys are left to the composer, which moves the cursor with them,
 * so the tabs switch on Tab and Shift+Tab instead.
 */
export const TabBar = ({
  tabs,
  activeTabId,
  onTabChange,
  renderContent,
}: TabBarProps) => {
  const theme = useTheme();

  useKeyboard((key) => {
    if (key.name !== "tab") {
      return;
    }

    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    const next = key.shift
      ? tabs[Math.max(0, index - 1)]
      : tabs[Math.min(tabs.length - 1, index + 1)];

    if (next && next.id !== activeTabId) {
      onTabChange(next.id);
    }
  });

  return (
    <box flexDirection="column">
      <TabbedContent
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.title,
          content: renderContent(tab),
        }))}
        activeTab={activeTabId ?? undefined}
        onChange={onTabChange}
        tabBarStyle="underline"
        keyboardNavigation={false}
      />
      <text fg={theme.colors.mutedForeground}>
        {"Tab switches tabs · ctrl+c quits"}
      </text>
    </box>
  );
};
