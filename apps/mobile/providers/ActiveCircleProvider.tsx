import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useActiveCircleStore } from '@/store/useActiveCircleStore';
import { useMyCircles, useMyMembership } from '@/hooks/useCircles';
import type { Circle, CircleMember } from '@/types/database';

interface ActiveCircleContextValue {
  circles: Circle[];
  circle: Circle | null;
  myMembership: CircleMember | null;
  isLoading: boolean;
  switchCircle: (circleId: string) => void;
}

const ActiveCircleContext = createContext<ActiveCircleContextValue | undefined>(undefined);

// Resolves which circle is "active" and exposes the current user's own
// circle_member row for it (their my_member_id) so screens never need to
// re-derive it. Falls back to the first circle if the stored selection is
// stale (e.g. the user left that circle on another device).
export function ActiveCircleProvider({ children }: { children: ReactNode }) {
  const { data: circles, isLoading: isLoadingCircles } = useMyCircles();
  const activeCircleId = useActiveCircleStore((s) => s.activeCircleId);
  const setActiveCircleId = useActiveCircleStore((s) => s.setActiveCircleId);

  useEffect(() => {
    if (!circles || circles.length === 0) return;
    const stillValid = circles.some((c) => c.id === activeCircleId);
    if (!activeCircleId || !stillValid) {
      setActiveCircleId(circles[0]?.id ?? null);
    }
  }, [circles, activeCircleId, setActiveCircleId]);

  const resolvedCircleId = circles?.some((c) => c.id === activeCircleId) ? activeCircleId : (circles?.[0]?.id ?? null);
  const circle = circles?.find((c) => c.id === resolvedCircleId) ?? null;
  const { data: myMembership, isLoading: isLoadingMembership } = useMyMembership(resolvedCircleId);

  return (
    <ActiveCircleContext.Provider
      value={{
        circles: circles ?? [],
        circle,
        myMembership: myMembership ?? null,
        isLoading: isLoadingCircles || isLoadingMembership,
        switchCircle: setActiveCircleId,
      }}
    >
      {children}
    </ActiveCircleContext.Provider>
  );
}

export function useActiveCircle() {
  const ctx = useContext(ActiveCircleContext);
  if (!ctx) throw new Error('useActiveCircle must be used within an ActiveCircleProvider');
  return ctx;
}
