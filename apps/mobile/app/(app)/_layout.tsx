import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useMyCircles } from '@/hooks/useCircles';
import { ActiveCircleProvider } from '@/providers/ActiveCircleProvider';
import { LoadingState } from '@/components/ui/LoadingState';

export default function AppLayout() {
  const { session } = useAuth();
  const { data: circles, isLoading } = useMyCircles();

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (isLoading) return <LoadingState />;
  if (!circles || circles.length === 0) return <Redirect href="/(onboarding)" />;

  return (
    <ActiveCircleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="task/create" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="project/create" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="project/[id]" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="wallet/history" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="circle/members" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="rewards" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="activity" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </ActiveCircleProvider>
  );
}
