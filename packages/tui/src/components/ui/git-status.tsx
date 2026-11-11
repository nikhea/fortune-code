import { useTheme } from "@/hooks/use-theme";

export interface GitStatusProps {
  branch: string;
  staged?: number;
  modified?: number;
  ahead?: number;
  behind?: number;
}

export const GitStatus = ({
  branch,
  staged = 0,
  modified = 0,
  ahead = 0,
  behind = 0,
}: GitStatusProps) => {
  const theme = useTheme();
  return (
    <box flexDirection="column" gap={0}>
      <text fg={theme.colors.primary}>
        <b>{"Branch "}</b>
        {branch}
      </text>
      <text
        fg={theme.colors.mutedForeground}
      >{`${ahead}↑ ${behind}↓ · staged ${staged} · modified ${modified}`}</text>
    </box>
  );
};
