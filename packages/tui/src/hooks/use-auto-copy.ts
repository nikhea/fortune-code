import { useRenderer, useSelectionHandler } from "@opentui/react";
import { useRef } from "react";
import { useClipboard } from "./use-clipboard";

/**
 * Copies whatever the user highlights to the clipboard.
 *
 * The renderer does the selection itself, so a drag across the output ends
 * in a selection, and the text goes to the clipboard as soon as the mouse
 * comes up. Nothing is selected by accident: a selection without text is
 * ignored.
 */
export const useAutoCopySelection = (onCopied?: (text: string) => void) => {
  const renderer = useRenderer();
  const { write } = useClipboard();
  const handler = useRef(onCopied);

  // The callback is read through a ref, so a new function on every render
  // does not tear the subscription down.
  handler.current = onCopied;

  useSelectionHandler((selection) => {
    const text = selection.getSelectedText();

    if (!text.trim()) {
      return;
    }

    if (renderer.copyToClipboardOSC52(text)) {
      handler.current?.(text);
      return;
    }

    // The renderer could not write the escape sequence, so it goes straight
    // to the output.
    void write(text)
      .then(() => handler.current?.(text))
      .catch(() => {
        // The terminal does not take clipboard escapes. Nothing to do.
      });
  });
};
