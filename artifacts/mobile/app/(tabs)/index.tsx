import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Box, Plus, Search, Sparkles, Watch } from 'lucide-react-native';
import { Avatar, EmptyState, ErrorState, GlassCard, GlassInput, ItemRow, SkeletonCard, StatTile } from '@/components/Primitives';
import { Screen, useScreenInsets } from '@/components/Screen';
import { WetrivaLogo } from '@/components/Brand';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { fetchDashboard } from '@/lib/data';
import { arabicNumber, daysUntil } from '@/lib/format';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchDashboard(user!.id),
  });

  function openSearch() {
    router.push({
      pathname: '/(tabs)/explore',
      params: search.trim() ? { search: search.trim() } : {},
    });
  }

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isLoading}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 112,
          gap: 22,
        }}
      >
        <View style={styles.header}>
          <WetrivaLogo />
          <View style={styles.headerActions}>
            <Text style={[styles.headerNote, { color: colors.subtleText }]}>{t.home.greeting}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.home.addItem}
              testID="home-add-item"
              onPress={() => router.push('/add-item')}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.accentWash, borderColor: colors.glassBorder },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Plus size={21} color={colors.primary} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 15 }}>
          <Text style={[styles.headline, { color: colors.text }]}>{t.home.headline}</Text>
          <GlassInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.home.searchPlaceholder}
            icon={Search}
            returnKeyType="search"
            onSubmitEditing={openSearch}
            testID="home-search"
          />
        </View>

        <View style={styles.statsRow}>
          <StatTile title={t.home.lent} count={query.data?.lent ?? 0} icon={Box} />
          <StatTile title={t.home.borrowed} count={query.data?.borrowed ?? 0} icon={Watch} />
        </View>

        <View style={{ gap: 13 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.activeTitle}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.home.seeAll}
              onPress={() => router.push('/(tabs)/requests')}
              style={styles.seeAll}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t.home.seeAll}</Text>
              <ArrowUpRight size={16} color={colors.primary} strokeWidth={1.8} />
            </Pressable>
          </View>

          {query.isLoading ? (
            <View style={{ gap: 10 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : query.isError ? (
            <ErrorState message={t.errors.offline} onRetry={() => void query.refetch()} />
          ) : (query.data?.activeLoans.length ?? 0) === 0 ? (
            <GlassCard>
              <EmptyState
                title={t.home.noLoans}
                description={t.home.noLoansHint}
                icon={Sparkles}
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/(tabs)/explore')}
                    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}
                  >
                    <Text style={{ color: colors.primary, fontFamily: 'IBMPlexSansArabic_600SemiBold' }}>
                      {t.nav.explore}
                    </Text>
                  </Pressable>
                }
              />
            </GlassCard>
          ) : (
            <View style={{ gap: 10 }}>
              {query.data?.activeLoans.map((loan) => {
                const isOwner = loan.owner_id === user?.id;
                const person = isOwner ? loan.borrower : loan.owner;
                const late = loan.status === 'overdue' || daysUntil(loan.due_at) < 0;
                const remaining = Math.max(0, daysUntil(loan.due_at));
                const item =
                  loan.item ??
                  ({
                    id: loan.item_id,
                    title: t.common.unknown,
                    owner_id: loan.owner_id,
                    description: null,
                    category: null,
                    condition: null,
                    photo_url: null,
                    is_available: false,
                    created_at: loan.requested_at,
                  } as const);
                return (
                  <View key={loan.id} style={{ gap: 8 }}>
                    <ItemRow
                      item={item}
                      owner={person}
                      onPress={() => router.push(`/item/${loan.item_id}`)}
                      badge={{
                        label: late
                          ? t.home.overdue
                          : `${arabicNumber(remaining)} ${t.home.daysLeft}`,
                        tone: late ? 'danger' : 'success',
                      }}
                    />
                    <View style={styles.personRow}>
                      <Avatar name={person?.name} uri={person?.avatar_url} size={28} />
                      <Text style={[styles.personText, { color: colors.subtleText }]}>
                        {t.home.personWith} {person?.name ?? t.common.unknown}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: rtlRowDirection, alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 12 },
  headerNote: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 12 },
  addButton: { width: 46, height: 46, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headline: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 26, textAlign: 'right', lineHeight: 38 },
  statsRow: { flexDirection: rtlRowDirection, gap: 11 },
  sectionHeader: { flexDirection: rtlRowDirection, alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 17, textAlign: 'right' },
  seeAll: { minHeight: 44, flexDirection: rtlRowDirection, alignItems: 'center', gap: 5 },
  seeAllText: { fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 12 },
  personRow: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 7, paddingHorizontal: 9 },
  personText: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 12 },
});
