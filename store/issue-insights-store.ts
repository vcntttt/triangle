import { create } from 'zustand';

interface IssueInsightsState {
   isOpen: boolean;
   toggle: () => void;
   setOpen: (isOpen: boolean) => void;
}

export const useIssueInsightsStore = create<IssueInsightsState>((set) => ({
   isOpen: false,
   toggle: () => set((state) => ({ isOpen: !state.isOpen })),
   setOpen: (isOpen) => set({ isOpen }),
}));
