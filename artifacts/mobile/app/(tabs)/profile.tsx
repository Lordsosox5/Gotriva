import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, LogOut, UserPlus } from 'lucide-react-native';
import { Avatar, Chip, EmptyState, ErrorState, GlassCard, GlassInput, ItemRow, PillButton, SkeletonCard } from '@/components/Primitives';
import { Screen, useScreenInsets } from '@/components/Screen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import {
  acceptFriendRequest,
  addFriendRequest,
  fetchFriends,
  fetchProfile,
  fetchPushNotificationsEnabled,
  fetchUserItems,
  findProfileByEmail,
} from '@/lib/data';
import { disableLoanNotifications, enableLoanNotifications } from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { arabicNumber } from '@/lib/format';
import { rtlRowDirection } from '@/lib/rtl';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useScreenInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [friendEmail, setFriendEmail] = useState('');
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchProfile(user!.id),
  });
  const itemsQuery = useQuery({
    queryKey: ['myItems', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchUserItems(user!.id),
  });
  const friendsQuery = useQuery({
    queryKey: ['friends', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchFriends(user!.id),
  });
  const pushEnabledQuery = useQuery({
    queryKey: ['pushEnabled', user?.id],
    enabled: Boolean(user?.id),
    queryFn: fetchPushNotificationsEnabled,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const friend = await findProfileByEmail(friendEmail);
      if (!friend) throw new Error('PROFILE_NOT_FOUND');
      if (friend.id === user?.id) throw new Error('CANNOT_ADD_SELF');
      await addFriendRequest(user!.id, friend.id);
    },
    onSuccess: async () => {
      setFriendEmail('');
      await queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      Alert.alert(t.profile.friendRequestSent);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('PROFILE_NOT_FOUND')) {
        Alert.alert(t.profile.friendNotFound);
      } else if (message.includes('CANNOT_ADD_SELF')) {
        Alert.alert(t.profile.cannotAddSelf);
      } else if (message.includes('FRIEND_ALREADY_CONNECTED')) {
        Alert.alert(t.profile.alreadyConnected);
      } else {
        Alert.alert(t.profile.friendRequestFailed);
      }
    },
  });

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
    onError: () => Alert.alert(t.profile.friendRequestFailed),
  });

  const notificationMutation = useMutation({
    mutationFn: async () => {
      if (pushEnabledQuery.data) {
        await disableLoanNotifications(user!.id);
      } else {
        await enableLoanNotifications(user!.id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['pushEnabled', user?.id] });
      Alert.alert(t.profile.notificationsUpdated);
    },
    onError: () => Alert.alert(t.profile.notificationsUnavailable),
  });

  async function signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) Alert.alert(t.profile.logoutFailed);
  }

  const profileName =
    profileQuery.data?.name ??
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : null) ??
    t.common.unknown;

  return (
    <Screen>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 112,
          gap: 18,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>{t.profile.title}</Text>

        <GlassCard style={styles.profileCard}>
          <Avatar
            name={profileName}
            uri={profileQuery.data?.avatar_url}
            size={72}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.name, { color: colors.text }]}>{profileName}</Text>
            <Text style={[styles.email, { color: colors.subtleText }]} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
        </GlassCard>

        <View style={{ gap: 11 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.profile.addFriend}</Text>
          <GlassCard style={{ padding: 14, gap: 12 }}>
            <GlassInput
              value={friendEmail}
              onChangeText={setFriendEmail}
              label={t.auth.email}
              placeholder={t.profile.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              textDirection="ltr"
              returnKeyType="send"
              testID="friend-email"
            />
            <PillButton
              label={t.profile.sendInvite}
              icon={UserPlus}
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!friendEmail.trim()}
              testID="friend-add"
            />
          </GlassCard>
        </View>

        <View style={{ gap: 11 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.profile.incomingFriends}</Text>
          {friendsQuery.isError ? (
            <ErrorState
              message={t.errors.offline}
              onRetry={() => void friendsQuery.refetch()}
            />
          ) : friendsQuery.isLoading ? (
            <SkeletonCard />
          ) : (friendsQuery.data?.incoming.length ?? 0) === 0 ? (
            <Text style={[styles.mutedText, { color: colors.subtleText }]}>{t.profile.noIncomingRequests}</Text>
          ) : (
            friendsQuery.data?.incoming.map((connection) => (
              <GlassCard key={connection.id} style={styles.friendRow}>
                <Avatar
                  name={connection.friend?.name}
                  uri={connection.friend?.avatar_url}
                  size={42}
                />
                <Text style={[styles.friendName, { color: colors.text }]}>
                  {connection.friend?.name ?? t.common.friend}
                </Text>
                <PillButton
                  label={t.profile.acceptFriend}
                  onPress={() => acceptMutation.mutate(connection.id)}
                  loading={acceptMutation.isPending}
                  style={{ minHeight: 44, paddingHorizontal: 14 }}
                />
              </GlassCard>
            ))
          )}
        </View>

        {!friendsQuery.isError && friendsQuery.data?.outgoing.length ? (
          <View style={{ gap: 11 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.profile.outgoingFriends}</Text>
            {friendsQuery.data.outgoing.map((connection) => (
              <GlassCard key={connection.id} style={styles.friendRow}>
                <Avatar
                  name={connection.friend?.name}
                  uri={connection.friend?.avatar_url}
                  size={42}
                />
                <Text style={[styles.friendName, { color: colors.text }]}>
                  {connection.friend?.name ?? t.common.friend}
                </Text>
                <Chip label={t.profile.pending} />
              </GlassCard>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 11 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.profile.friends}</Text>
            {friendsQuery.data?.accepted.length ? (
              <Chip label={arabicNumber(friendsQuery.data.accepted.length)} />
            ) : null}
          </View>
          {friendsQuery.isError ? (
            <ErrorState
              message={t.errors.offline}
              onRetry={() => void friendsQuery.refetch()}
            />
          ) : friendsQuery.isLoading ? (
            <SkeletonCard />
          ) : (friendsQuery.data?.accepted.length ?? 0) === 0 ? (
            <GlassCard>
              <EmptyState title={t.profile.noFriends} description={t.profile.noFriendsHint} icon={UserPlus} />
            </GlassCard>
          ) : (
            friendsQuery.data?.accepted.map((connection) => (
              <GlassCard key={connection.id} style={styles.friendRow}>
                <Avatar
                  name={connection.friend?.name}
                  uri={connection.friend?.avatar_url}
                  size={42}
                />
                <Text style={[styles.friendName, { color: colors.text }]}>
                  {connection.friend?.name ?? t.common.friend}
                </Text>
                <View style={{ flex: 1 }} />
              </GlassCard>
            ))
          )}
        </View>

        <View style={{ gap: 11 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.profile.myItems}</Text>
          {itemsQuery.isError ? (
            <ErrorState
              message={t.errors.offline}
              onRetry={() => void itemsQuery.refetch()}
            />
          ) : itemsQuery.isLoading ? (
            <View style={{ gap: 10 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (itemsQuery.data?.length ?? 0) === 0 ? (
            <GlassCard>
              <EmptyState
                title={t.profile.noItems}
                description={t.profile.noItemsHint}
                action={
                  <PillButton
                    label={t.home.addItem}
                    onPress={() => router.push('/add-item')}
                    style={{ marginTop: 6 }}
                  />
                }
              />
            </GlassCard>
          ) : (
            itemsQuery.data?.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onPress={() => router.push(`/item/${item.id}`)}
                badge={{
                  label: item.is_available ? t.explore.available : t.item.unavailable,
                  tone: item.is_available ? 'success' : 'neutral',
                }}
              />
            ))
          )}
        </View>

        <View style={{ gap: 11 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.profile.notificationTitle}</Text>
          {pushEnabledQuery.isError ? (
            <ErrorState
              message={t.errors.offline}
              onRetry={() => void pushEnabledQuery.refetch()}
            />
          ) : null}
          <PillButton
            label={pushEnabledQuery.data ? t.profile.notificationsOff : t.profile.notificationsOn}
            icon={pushEnabledQuery.data ? BellOff : Bell}
            variant="secondary"
            loading={notificationMutation.isPending}
            onPress={() => notificationMutation.mutate()}
            testID="notifications-toggle"
          />
        </View>

        <PillButton
          label={t.profile.logout}
          icon={LogOut}
          variant="danger"
          onPress={() => void signOut()}
          testID="logout"
        />
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'IBMPlexSansArabic_700Bold', textAlign: 'right', fontSize: 27 },
  profileCard: { padding: 16, flexDirection: rtlRowDirection, alignItems: 'center', gap: 14 },
  name: { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 18, textAlign: 'right' },
  email: { fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 12, textAlign: 'right' },
  sectionTitle: { fontFamily: 'IBMPlexSansArabic_600SemiBold', textAlign: 'right', fontSize: 16 },
  sectionHeader: { flexDirection: rtlRowDirection, alignItems: 'center', justifyContent: 'space-between' },
  mutedText: { fontFamily: 'IBMPlexSansArabic_400Regular', textAlign: 'right', fontSize: 13 },
  friendRow: { flexDirection: rtlRowDirection, alignItems: 'center', gap: 10, padding: 12, minHeight: 68 },
  friendName: { flex: 1, fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 14, textAlign: 'right' },
});
