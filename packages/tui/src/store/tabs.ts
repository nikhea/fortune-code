import { create } from "zustand";

export type TabStatus =
  | "connecting"
  | "ready"
  | "streaming"
  | "awaiting-approval"
  | "error";

export type Tab = {
  /** Local id of the tab. */
  id: string;
  /** The server session this tab talks to. */
  sessionId: string;
  /** The server thread this tab shows. */
  threadId: string;
  title: string;
  status: TabStatus;
  /** The mode the session is in. */
  mode?: string;
  /** The model the session runs on. */
  model?: string;
  error?: string;
};

type TabsStore = {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  /** The active tab, if there is one. */
  activeTab: () => Tab | undefined;
};

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),

  closeTab: (id) =>
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== id);

      if (state.activeTabId !== id) {
        return { tabs };
      }

      // The closed tab was the active one: fall back to the one next to it.
      const index = state.tabs.findIndex((tab) => tab.id === id);
      const next = tabs[Math.min(index, tabs.length - 1)];

      return { tabs, activeTabId: next?.id ?? null };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, patch) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, ...patch } : tab,
      ),
    })),

  activeTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((tab) => tab.id === activeTabId);
  },
}));
