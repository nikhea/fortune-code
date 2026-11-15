import { useKeyboard } from "@opentui/react";

import { useTheme } from "@/hooks/use-theme";

export interface CommandListItem {
  id: string;
  /** The text of the item, such as "/mode". */
  label: string;
  /** What the item does, shown next to the label. */
  description?: string;
}

export interface CommandListProps {
  items: CommandListItem[];
  /** The highlighted item. */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  /** Shown when there is no item to pick. */
  emptyMessage?: string;
  /** The most items to show at once. */
  maxVisible?: number;
}

/**
 * A list of commands with one of them highlighted.
 *
 * The list owns the arrow keys, because the composer leaves them alone. The
 * caller owns the rest: the return key belongs to the composer, which is
 * where the command runs.
 */
export const CommandList = ({
  items,
  activeIndex,
  onActiveIndexChange,
  emptyMessage = "No matching command",
  maxVisible = 8,
}: CommandListProps) => {
  const theme = useTheme();

  useKeyboard((key) => {
    if (items.length === 0) {
      return;
    }

    if (key.name === "up") {
      onActiveIndexChange(Math.max(0, activeIndex - 1));
      return;
    }

    if (key.name === "down") {
      onActiveIndexChange(Math.min(items.length - 1, activeIndex + 1));
    }
  });

  if (items.length === 0) {
    return (
      <text fg={theme.colors.mutedForeground}>{emptyMessage}</text>
    );
  }

  const visible = items.slice(0, maxVisible);

  return (
    <box flexDirection="column">
      {visible.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <box key={item.id} flexDirection="row" gap={1}>
            <text fg={isActive ? theme.colors.primary : theme.colors.mutedForeground}>
              {isActive ? "›" : " "}
            </text>
            <text fg={isActive ? theme.colors.primary : theme.colors.foreground}>
              {isActive ? <b>{item.label}</b> : item.label}
            </text>
            {item.description && (
              <text fg={theme.colors.mutedForeground}>{item.description}</text>
            )}
          </box>
        );
      })}
    </box>
  );
};
