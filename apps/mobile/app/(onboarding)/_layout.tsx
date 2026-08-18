import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useMyCircles } from '@/hooks/useCircles';
import { LoadingState } from '@/components/ui/LoadingState';

export default function OnboardingLayout() {
  const { session } = useAuth();
  const { data: circles, isLoading } = useMyCircles();

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (isLoading) return <LoadingState />;
  if (circles && circles.length > 0) return <Redirect href="/(app)/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
