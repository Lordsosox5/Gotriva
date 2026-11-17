import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Box, Check, Clock3, Pencil, UserRound, type LucideIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Avatar, Chip, ErrorState, GlassCard, PillButton, SegmentedControl, Skeleton } from '@/components/Primitives';
import { Screen, useScreenInsets } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { fetchItemWithOwner, requestLoan } from '@/lib/data';
import { t } from '@/lib/i18n';
import type { ItemWithOwner } from '@/lib/database.types';
import { rtlRowDirection } from '@/lib/rtl';

const durationOptions = [
  { value: '3', label: t.item.threeDays },
  { value: '7', label: t.item.oneWeek },
  { value: '14', label: t.item.twoWeeks },
];

function conditionLabel(item: ItemWithOwner): string {
  if (item.condition === 'excellent') return t.item.excellent;
  if (item.condition === 'fair') return t.item.fair;
  return t.item.good;
}

export default function ItemDetailScreen() {
  const colors = useColors();
  const insets = useScreenInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const itemId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [duration, setDuration] = useState('7');
  const query = useQuery({
    queryKey: ['item', itemId],
    enabled: Boolean(itemId),
    queryFn: () => fetchItemWithOwner(itemId),
  });
  const mutation = useMutation({
    mutationFn: (item: ItemWithOwner) =>
      requestLoan(item, user!.id, Number(duration)),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      Alert.alert(t.item.requestSent);
      router.push('/(tabs)/requests');
    },
    onError: () => Alert.alert(t.item.requestFailed),
  });
  const item = query.data;
  const ownItem = Boolean(item && user?.id === item.owner_id);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: insets.bottom + 36,
          gap: 16,
        }}
      >
        <View style={styles.pageHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            testID="item-back"
            onPress={() => router.back()}
            style={[styles.iconButton, { borderColor: colors.glassBorder }]}
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={1.8} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.item.detailTitle}</Text>
          <View style={{ width: 44 }} />
        </View>

        {query.isLoading ? (
          <View style={{ gap: 15 }}>
            <Skeleton height={250} style={{ borderRadius: 24 }} />
            <Skeleton height={28} width="65%" />
            <Skeleton height={90} style={{ borderRadius: 20 }} />
          </View>
        ) : query.isError ? (
          <ErrorState
            message={t.errors.offline}
            onRetry={() => void query.refetch()}
          />
        ) : !item ? (
          <GlassCard>
            <Text style={[styles.body, { color: colors.subtleText, textAlign: 'center' }]}>
              {t.item.itemNotFound}
            </Text>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={styles.hero}>
              {item.photo_url ? (
                <Image
                  source={{ uri: item.photo_url }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
                  transition={180}
                />
              ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.photoPlaceholder,
                  { backgroundColor: colors.accentWash },
                ]}
              >
                  <Box size={42} color={colors.primary} strokeWidth={1.6} />
                </View>
              )}
              <View style={styles.heroOverlay}>
                <Chip
                  label={item.is_available ? t.explore.available : t.item.unavailable}
                  tone={item.is_available ? 'success' : 'danger'}
                />
              </View>
            </GlassCard>

            <View style={styles.titleRow}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                {item.category ? (
                  <Text style={[styles.body, { color: colors.subtleText, textAlign: 'right' }]}>
                    {item.category}
                  </Text>
                ) : null}
              </View>
              {item.owner ? (
                <Avatar
                  name={item.owner.name}
                  uri={item.owner.avatar_url}
                  size={50}
                />
              ) : null}
            </View>

            <View style={styles.infoRow}>
              <InfoTile
                icon={Check}
                title={t.item.condition}
                value={conditionLabel(item)}
              />
              <InfoTile
                icon={UserRound}
                title={t.item.owner}
                value={item.owner?.name ?? t.common.unknown}
              />
              <InfoTile
                icon={Clock3}
                title={t.item.handoff}
                value={t.common.delivery}
              />
            </View>

            <GlassCard style={{ padding: 17 }}>
              <Text style={[styles.description, { color: colors.text }]}>
                {item.description?.trim() || t.item.noDescription}
              </Text>
            </GlassCard>

            {ownItem ? (
              <PillButton
                label={t.item.edit}
                icon={Pencil}
                onPress={() => router.push({ pathname: '/add-item', params: { id: item.id } })}
                testID="item-edit"
              />
            ) : (
              <>
                <View style={{ gap: 9 }}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    {t.item.duration}
                  </Text>
                  <SegmentedControl
                    options={durationOptions}
                    value={duration}
                    onChange={setDuration}
                    testID="loan-duration"
                  />
                </View>
                <PillButton
                  label={t.item.request}
                  onPress={() => mutation.mutate(item)}
                  loading={mutation.isPending}
                  disabled={!item.is_available}
                  testID="request-loan"
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function InfoTile({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <GlassCard style={styles.infoTile}>
      <Icon size={19} color={colors.primary} strokeWidth={1.8} />
      <Text numberOfLines={1} style={[styles.infoTitle, { color: colors.subtleText }]}>
        {title}
      </Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: colors.text }]}>
        {value}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  pageHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 16 },
  hero: { height: 245, justifyContent: 'flex-end' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { alignItems: 'flex-start', padding: 14 },
  titleRow: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 13 },
  itemTitle: { fontFamily: 'IBMPlexSansArabic_700Bold', textAlign: 'right', fontSize: 23 },
  body: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 13, lineHeight: 22 },
  infoRow: { flexDirection: rtlRowDirection, gap: 8 },
  infoTile: { flex: 1, minHeight: 100, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', gap: 5 },
  infoTitle: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 11 },
  infoValue: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 12, maxWidth: '100%' },
  description: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 14, textAlign: 'right', lineHeight: 25 },
  sectionLabel: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 14, textAlign: 'right' },
});
