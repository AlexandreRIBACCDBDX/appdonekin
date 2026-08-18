import { Slot } from 'expo-router';

// Not an actual tab navigator: <BottomNav/> renders the persistent bottom
// bar, and each of the four screens below (plus notifications, outside this
// group) render it themselves — so this stays a pass-through and switching
// between them is a normal route change.
export default function TabsLayout() {
  return <Slot />;
}
