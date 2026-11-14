import type { Theme } from "@/components/ui/types";

/**
 * The color of a mode. Every mode keeps its own color, so a glance at the
 * bar says which mode a tab is in.
 */
const MODE_COLOR_BY_ID: Record<string, keyof Theme["colors"]> = {
  build: "success",
  plan: "warning",
  fast: "info",
};

/** The colors a mode falls back to, in order, when it is not a known one. */
const MODE_COLOR_FALLBACK: (keyof Theme["colors"])[] = [
  "success",
  "warning",
  "info",
  "accent",
  "secondary",
];

/**
 * The color of a mode, by its id. The index is the place of the mode in the
 * controller, which picks the fallback for a mode that is not a known one.
 */
export const modeColor = (
  theme: Theme,
  modeId: string | undefined,
  index = 0,
): string => {
  if (!modeId) {
    return theme.colors.mutedForeground;
  }

  const key =
    MODE_COLOR_BY_ID[modeId] ??
    MODE_COLOR_FALLBACK[index % MODE_COLOR_FALLBACK.length];

  return theme.colors[key];
};
