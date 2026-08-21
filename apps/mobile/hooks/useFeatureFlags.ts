import { useQuery } from '@tanstack/react-query';
import { fetchFeatureFlag } from '@/services/config';

// Polls rather than just reading once — an admin toggling maintenance mode
// should take effect for someone who already has the app open, not only on
// their next cold start.
export function useMaintenanceMode() {
  return useQuery({
    queryKey: ['feature-flags', 'maintenance_mode_enabled'],
    queryFn: () => fetchFeatureFlag('maintenance_mode_enabled'),
    refetchInterval: 60_000,
  });
}
