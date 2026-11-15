import { CommandList } from "@/components/ui/command-list";
import type { SlashCommand } from "@/lib/slash-commands";

export interface SlashCommandMenuProps {
  /** The commands that match what the user typed. */
  commands: SlashCommand[];
  /** The highlighted command. */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

/**
 * The list of commands that match what the user typed.
 *
 * The menu shows while the composer holds a command. It picks the command the
 * arrows move over, and the composer runs it.
 */
export const SlashCommandMenu = ({
  commands,
  activeIndex,
  onActiveIndexChange,
}: SlashCommandMenuProps) => {
  return (
    <CommandList
      items={commands.map((command) => ({
        id: command.name,
        label: `/${command.name}`,
        description: command.argument
          ? `${command.description} ${command.argument}`
          : command.description,
      }))}
      activeIndex={activeIndex}
      onActiveIndexChange={onActiveIndexChange}
    />
  );
};
