import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { ItemRow, Chip, EmptyState, ErrorState, GlassInput, SkeletonCard } from '@/components/Primitives';
import { Screen, useScreenInsets } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { fetchExploreItems } from '@/lib/data';
import type { FriendProfile } from '@/lib/database.types';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ search?: string }>();
  const initialSearch = typeof params.search === 'string' ? params.search : '';
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string>(t.explore.categories[0]);
  const [friendId, setFriendId] = useState('');
  const query = useQuery({
    queryKey: ['explore', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchExploreItems(user!.id),
  });
  const term = search.trim().toLocaleLowerCase();
  const matchingFriends = useMemo(
    () =>
      (query.data?.friends ?? []).filter((friend) =>
        (friend.name ?? '').toLocaleLowerCase().includes(term),
      ),
    [query.data?.friends, term],
  );
  const items = useMemo(
    () =>
      (query.data?.items ?? []).filter((item) => {
        if (category !== t.explore.categories[0] && item.category !== category) return false;
        if (friendId && item.owner_id !== friendId) return false;
        if (!term) return true;
        return `${item.title} ${item.description ?? ''} ${item.owner?.name ?? ''}`
          .toLocaleLowerCase()
          .includes(term);
      }),
    [category, friendId, query.data?.items, term],
  );

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={query.isLoading || items.length > 0}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 112,
          gap: 12,
        }}
        ListHeaderComponent={
          <View style={{ gap: 18, paddingBottom: 7 }}>
            <View style={{ gap: 3 }}>
              <Text style={[styles.title, { color: colors.text }]}>{t.explore.title}</Text>
              <Text style={[styles.subtitle, { color: colors.subtleText }]}>{t.explore.subtitle}</Text>
            </View>
            <GlassInput
              value={search}
              onChangeText={setSearch}
              placeholder={t.explore.searchPlaceholder}
              icon={Search}
              returnKeyType="search"
              accessibilityLabel={t.explore.searchPlaceholder}
              testID="explore-search"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: rtlRowDirection, gap: 8 }}
            >
              {t.explore.categories.map((itemCategory) => (
                <Chip
                  key={itemCategory}
                  label={itemCategory}
                  selected={category === itemCategory}
                  onPress={() => setCategory(itemCategory)}
                />
              ))}
            </ScrollView>
            {term && matchingFriends.length > 0 ? (
              <View style={{ gap: 9 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.explore.friends}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexDirection: rtlRowDirection, gap: 8 }}
                >
                  {matchingFriends.map((friend: FriendProfile) => (
                    <Chip
                      key={friend.id}
                      label={friend.name ?? t.common.friend}
                      selected={friendId === friend.id}
                      onPress={() => setFriendId(friendId === friend.id ? '' : friend.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            owner={item.owner}
            badge={{ label: t.explore.available, tone: 'success' }}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
        ListEmptyComponent={
          query.isLoading ? (
            <View style={{ gap: 12 }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : query.isError ? (
            <ErrorState
              message={t.errors.offline}
              onRetry={() => void query.refetch()}
            />
          ) : query.data?.friends.length === 0 ? (
            <EmptyState
              title={t.explore.noItems}
              description={t.explore.noFriends}
            />
          ) : (
            <EmptyState
              title={t.explore.noItems}
              description={term ? t.common.noResults : t.explore.noItemsHint}
            />
          )
        }
        refreshing={query.isRefetching && !query.isLoading}
        onRefresh={() => void query.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 27, textAlign: 'right' },
  subtitle: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 13, textAlign: 'right' },
  sectionTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 16, textAlign: 'right' },
});
