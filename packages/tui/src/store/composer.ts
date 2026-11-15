import { create } from "zustand";

/** A line the commands printed, shown in the conversation. */
export interface ComposerNotice {
  id: string;
  /** The text of the notice. */
  text: string;
  /** When it was printed, so it lands in the transcript in order. */
  at: number;
}

type ComposerState = {
  /** The text of the composer, per tab. */
  drafts: Record<string, string>;
  /** The highlighted command of the slash menu, per tab. */
  slashIndexes: Record<string, number>;
  /** What the commands printed, per tab. */
  notices: Record<string, ComposerNotice[]>;

  setDraft: (tabId: string, draft: string) => void;
  setSlashIndex: (tabId: string, index: number) => void;
  addNotice: (tabId: string, text: string) => void;
  clearNotices: (tabId: string) => void;
};

let noticeCount = 0;

export const useComposerStore = create<ComposerState>((set) => ({
  drafts: {},
  slashIndexes: {},
  notices: {},

  setDraft: (tabId, draft) =>
    set((state) => ({
      drafts: { ...state.drafts, [tabId]: draft },
      // A new draft is a new list of matches, so the highlight goes back to
      // the top of the list.
      slashIndexes: { ...state.slashIndexes, [tabId]: 0 },
    })),

  setSlashIndex: (tabId, index) =>
    set((state) => ({
      slashIndexes: { ...state.slashIndexes, [tabId]: index },
    })),

  addNotice: (tabId, text) =>
    set((state) => ({
      notices: {
        ...state.notices,
        [tabId]: [
          ...(state.notices[tabId] ?? []),
          { id: `notice-${(noticeCount += 1)}`, text, at: Date.now() },
        ],
      },
    })),

  clearNotices: (tabId) =>
    set((state) => ({
      notices: { ...state.notices, [tabId]: [] },
    })),
}));
