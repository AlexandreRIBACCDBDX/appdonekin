import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ActiveCircleState {
  activeCircleId: string | null;
  setActiveCircleId: (id: string | null) => void;
}

// This store holds ONLY a UI selection (which circle is active). It never
// duplicates circle/member/task data — that all stays in React Query,
// backed directly by Supabase.
export const useActiveCircleStore = create<ActiveCircleState>()(
  persist(
    (set) => ({
      activeCircleId: null,
      setActiveCircleId: (id) => set({ activeCircleId: id }),
    }),
    {
      name: 'donekin-active-circle',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
