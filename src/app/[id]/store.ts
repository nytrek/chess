import { create } from "zustand";

interface State {
  views: number;
  setViews: (views: number) => void;
}

/**
 * @see https://github.com/pmndrs/zustand
 * @see https://github.com/typehero/typehero/blob/main/apps/web/src/app/%5Blocale%5D/(playgrounds)/challenge-playground/challenge-playground-store.ts
 */
export const useViewStore = create<State>((set) => ({
  views: 0,
  setViews: (views) => set({ views }),
}));
