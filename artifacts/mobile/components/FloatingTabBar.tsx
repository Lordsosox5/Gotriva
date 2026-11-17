import { BlurView } from 'expo-blur';
import {
  Compass,
  House,
  UserRound,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { arabicNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

const tabContent: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: t.nav.home, icon: House },
  explore: { label: t.nav.explore, icon: Compass },
  requests: { label: t.nav.requests, icon: ClipboardList },
  profile: { label: t.nav.profile, icon: UserRound },
};

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets: _routerInsets,
}: BottomTabBarProps) {
  const colors = useColors();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const { data: badgeCount = 0 } = useQuery({
    queryKey: ['incomingRequestCount', user?.id],
    enabled: Boolean(user?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { count, error } = await getSupabase()
        .from('loans')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user!.id)
        .eq('status', 'requested');
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <View
      style={[
        styles.position,
        { bottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 10 },
      ]}
    >
      <BlurView
        intensity={48}
        tint="dark"
        style={[
          styles.bar,
          {
            backgroundColor: colors.glass,
            borderColor: colors.glassBorder,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const item = tabContent[route.name];
          if (!item) return null;
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const Icon = item.icon;
          const label = options?.tabBarAccessibilityLabel ?? item.label;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() =>
                emitter.emit({ type: 'tabLongPress', target: route.key })
              }
              style={styles.tab}
            >
              <View
                style={[
                  styles.tabPill,
                  focused && { backgroundColor: colors.primary },
                ]}
              >
                <View style={styles.iconWrap}>
                  <Icon
                    size={19}
                    color={focused ? colors.primaryForeground : colors.subtleText}
                    strokeWidth={1.8}
                  />
                  {route.name === 'requests' && badgeCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                      <Text style={[styles.badgeText, { color: colors.destructiveForeground }]}>
                        {arabicNumber(badgeCount)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: focused ? colors.primaryForeground : colors.subtleText },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: 18, right: 18 },
  bar: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 36,
    overflow: 'hidden',
    flexDirection: rtlRowDirection,
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tab: { flex: 1, minWidth: 54, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  tabPill: {
    minHeight: 54,
    minWidth: 56,
    paddingHorizontal: 11,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  iconWrap: { minHeight: 24, justifyContent: 'center' },
  label: { fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 10, maxWidth: 64 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -11,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 9 },
});
