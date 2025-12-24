import { create } from 'zustand';

interface AppState {
  hasCompletedOnboarding: boolean;
  hasAcceptedTerms: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  setHasAcceptedTerms: (value: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  hasAcceptedTerms: false,
  setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
  setHasAcceptedTerms: (value) => set({ hasAcceptedTerms: value }),
}));
