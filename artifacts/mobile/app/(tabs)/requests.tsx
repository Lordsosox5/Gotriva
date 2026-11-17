import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Box, Check, Clock3, RotateCcw } from 'lucide-react-native';
import { Avatar, Chip, EmptyState, ErrorState, GlassCard, PillButton, SegmentedControl, SkeletonCard } from '@/components/Primitives';
import { Screen, useScreenInsets } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { fetchLoans } from '@/lib/data';
import { formatDate } from '@/lib/format';
import type { LoanStatus, LoanWithPeople } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { rtlRowDirection } from '@/lib/rtl';

type LoanAction = 'accept' | 'decline' | 'handover' | 'return';

function statusText(status: LoanStatus): string {
  switch (status) {
    case 'requested':
      return t.requests.requested;
    case 'accepted':
      return t.requests.accepted;
    case 'declined':
      return t.requests.declined;
    case 'handed_over':
      return t.requests.handedOver;
    case 'overdue':
      return t.requests.overdue;
    case 'returned':
      return t.requests.returned;
  }
}

function statusTone(status: LoanStatus): 'success' | 'danger' | 'neutral' {
  if (status === 'overdue' || status === 'declined') return 'danger';
  if (status === 'handed_over' || status === 'returned') return 'success';
  return 'neutral';
}

export default function RequestsScreen() {
  const colors = useColors();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('incoming');
  const query = useQuery({
    queryKey: ['loans', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchLoans(user!.id),
  });
  const mutation = useMutation({
    mutationFn: async ({ loan, action }: { loan: LoanWithPeople; action: LoanAction }) => {
      const client = getSupabase();
      if (action === 'accept' || action === 'decline') {
        const { error } = await client.rpc('respond_to_loan', {
          p_loan_id: loan.id,
          p_accept: action === 'accept',
        });
        if (error) throw error;
      } else if (action === 'handover') {
        const { error } = await client.rpc('confirm_handover', { p_loan_id: loan.id });
        if (error) throw error;
      } else {
        const { error } = await client.rpc('confirm_return', { p_loan_id: loan.id });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      Alert.alert(t.requests.actionDone);
    },
    onError: () => Alert.alert(t.requests.actionFailed),
  });

  const isIncoming = tab === 'incoming';
  const loans = (query.data ?? []).filter((loan) =>
    isIncoming ? loan.owner_id === user?.id : loan.borrower_id === user?.id,
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 9,
          paddingBottom: insets.bottom + 112,
          gap: 18,
        }}
      >
        <View style={{ gap: 3 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.requests.title}</Text>
          <Text style={[styles.subtitle, { color: colors.subtleText }]}>{t.requests.emptyHint}</Text>
        </View>
        <SegmentedControl
          options={[
            { value: 'incoming', label: t.requests.incoming },
            { value: 'outgoing', label: t.requests.outgoing },
          ]}
          value={tab}
          onChange={setTab}
          testID="requests-segment"
        />

        {query.isLoading ? (
          <View style={{ gap: 11 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : query.isError ? (
          <ErrorState message={t.errors.offline} onRetry={() => void query.refetch()} />
        ) : loans.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={isIncoming ? t.requests.emptyIncoming : t.requests.emptyOutgoing}
              description={t.requests.emptyHint}
              icon={Clock3}
            />
          </GlassCard>
        ) : (
          <View style={{ gap: 12 }}>
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                incoming={isIncoming}
                busy={mutation.isPending}
                onAction={(action) => mutation.mutate({ loan, action })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function LoanCard({
  loan,
  incoming,
  busy,
  onAction,
}: {
  loan: LoanWithPeople;
  incoming: boolean;
  busy: boolean;
  onAction: (action: LoanAction) => void;
}) {
  const colors = useColors();
  const other = incoming ? loan.borrower : loan.owner;
  const currentStep =
    loan.status === 'returned'
      ? 2
      : loan.status === 'handed_over' || loan.status === 'overdue'
        ? 1
        : 0;
  const isPending = loan.status === 'requested';
  const canHandover = incoming && loan.status === 'accepted';
  const canReturn = incoming && (loan.status === 'handed_over' || loan.status === 'overdue');
  return (
    <GlassCard style={styles.loanCard}>
      <View style={styles.loanHeader}>
        <View style={styles.loanImage}>
          {loan.item?.photo_url ? (
            <Image source={{ uri: loan.item.photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Box size={24} color={colors.primary} strokeWidth={1.8} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>
            {loan.item?.title ?? t.common.unknown}
          </Text>
          <View style={styles.person}>
            <Avatar name={other?.name} uri={other?.avatar_url} size={25} />
            <Text numberOfLines={1} style={[styles.personName, { color: colors.subtleText }]}>
              {t.requests.withPerson} {other?.name ?? t.common.unknown}
            </Text>
          </View>
        </View>
        <Chip label={statusText(loan.status)} tone={statusTone(loan.status)} />
      </View>

      {!isPending && loan.status !== 'declined' ? (
        <View style={styles.tracker}>
          <TrackerStep label={t.requests.trackerHandover} done={currentStep >= 1} active={currentStep === 0} />
          <View style={[styles.connector, currentStep >= 1 && { backgroundColor: colors.primary }]} />
          <TrackerStep label={t.requests.trackerUse} done={currentStep >= 2} active={currentStep === 1} />
          <View style={[styles.connector, currentStep >= 2 && { backgroundColor: colors.primary }]} />
          <TrackerStep label={t.requests.trackerReturn} done={currentStep >= 2} active={currentStep === 2} />
        </View>
      ) : null}

      {loan.due_at && loan.status !== 'returned' ? (
        <Text style={[styles.dueText, { color: colors.subtleText }]}>
          {t.requests.due}: {formatDate(loan.due_at)}
        </Text>
      ) : null}

      {isPending && incoming ? (
        <View style={styles.actions}>
          <PillButton
            label={t.requests.accept}
            icon={Check}
            onPress={() => onAction('accept')}
            loading={busy}
            style={{ flex: 1 }}
          />
          <PillButton
            label={t.requests.decline}
            onPress={() => onAction('decline')}
            variant="danger"
            loading={busy}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
      {canHandover ? (
        <PillButton
          label={t.requests.handover}
          icon={Check}
          onPress={() => onAction('handover')}
          loading={busy}
        />
      ) : null}
      {canReturn ? (
        <PillButton
          label={t.requests.return}
          icon={RotateCcw}
          onPress={() => onAction('return')}
          loading={busy}
        />
      ) : null}
    </GlassCard>
  );
}

function TrackerStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.trackerStep}>
      <View
        style={[
          styles.trackerDot,
          {
            backgroundColor: done || active ? colors.primary : colors.glassSubtle,
          },
        ]}
      >
        {done ? (
          <Check size={12} color={colors.primaryForeground} strokeWidth={2} />
        ) : active ? (
          <Clock3 size={12} color={colors.primaryForeground} strokeWidth={1.8} />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.trackerLabel,
          { color: done || active ? colors.text : colors.subtleText },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'IBMPlexSansArabic_700Bold', fontSize: 27, textAlign: 'right' },
  subtitle: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 12, textAlign: 'right' },
  loanCard: { padding: 14, gap: 15 },
  loanHeader: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 10 },
  loanImage: { width: 58, height: 58, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 15, textAlign: 'right' },
  person: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 6 },
  personName: { flexShrink: 1, fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 11, textAlign: 'right' },
  tracker: { flexDirection: rtlRowDirection, alignItems: 'center', paddingHorizontal: 3 },
  trackerStep: { alignItems: 'center', gap: 5, minWidth: 58 },
  trackerDot: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  trackerLabel: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 10 },
  connector: { flex: 1, height: 2, marginBottom: 17 },
  dueText: { textAlign: 'right', fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 12 },
  actions: { flexDirection: rtlRowDirection, gap: 9 },
});
