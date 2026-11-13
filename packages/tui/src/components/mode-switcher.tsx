import { useKeyboard } from "@opentui/react";
import { useEffect } from "react";
import type { KeyEvent } from "@opentui/core";

import { useTheme } from "@/hooks/use-theme";
import { useModes, useSessionState, useSwitchMode } from "@/hooks/use-agent";
import type { AgentConnection } from "@/lib/connection";
import { useTabsStore } from "@/store/tabs";
import type { Tab } from "@/store/tabs";

export interface ModeSwitcherProps {
  connection: AgentConnection;
  tab: Tab;
}

/**
 * The mode a key press asks for.
 *
 * The function keys work everywhere. The number keys work with ctrl or alt
 * held, but only where the terminal reports a modified digit as a digit: a
 * plain ctrl+1 arrives as a control code in a terminal without the kitty
 * keyboard protocol.
 */
const modeIndexOf = (key: KeyEvent): number | undefined => {
  if (key.name === "f1") return 0;
  if (key.name === "f2") return 1;
  if (key.name === "f3") return 2;

  if ((key.ctrl || key.meta) && /^[0-9]$/.test(key.name)) {
    return Number(key.name) - 1;
  }

  return undefined;
};

/**
 * Switches the mode of the tab's session.
 *
 * The mode belongs to the session, so two tabs can be in different modes at
 * the same time.
 */
export const ModeSwitcher = ({ connection, tab }: ModeSwitcherProps) => {
  const theme = useTheme();
  const { data: modes = [] } = useModes(connection);
  const { data: state } = useSessionState(connection, tab.sessionId);
  const switchMode = useSwitchMode(connection, tab.sessionId);
  const updateTab = useTabsStore((store) => store.updateTab);

  const modeId = state?.modeId;

  // The session is the source of truth for the mode; the tab mirrors it.
  useEffect(() => {
    if (modeId) {
      updateTab(tab.id, { mode: modeId });
    }
  }, [modeId, updateTab, tab.id]);

  useKeyboard((key) => {
    const index = modeIndexOf(key);

    if (index === undefined) {
      return;
    }

    const mode = modes[index];

    if (!mode || mode.id === modeId) {
      return;
    }

    void switchMode.mutateAsync(mode.id);
  });

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.colors.mutedForeground}>mode</text>
      {modes.map((mode, index) => {
        const isActive = mode.id === modeId;

        return (
          <text
            key={mode.id}
            fg={isActive ? theme.colors.primary : theme.colors.mutedForeground}
          >
            {isActive ? <b>{mode.name}</b> : mode.name}
            {index < modes.length - 1 ? " │ " : ""}
          </text>
        );
      })}
    </box>
  );
};
