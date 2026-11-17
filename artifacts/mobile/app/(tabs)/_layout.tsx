import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { t } from '@/lib/i18n';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.nav.home }} />
      <Tabs.Screen name="explore" options={{ title: t.nav.explore }} />
      <Tabs.Screen name="requests" options={{ title: t.nav.requests }} />
      <Tabs.Screen name="profile" options={{ title: t.nav.profile }} />
    </Tabs>
  );
}
