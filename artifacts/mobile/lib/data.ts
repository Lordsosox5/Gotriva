import type {
  ConnectionRow,
  ConnectionWithFriend,
  FriendProfile,
  ItemRow,
  ItemWithOwner,
  LoanRow,
  LoanWithPeople,
  ProfileInfo,
  ProfileRow,
} from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function profilesByIds(ids: string[]): Promise<Map<string, FriendProfile>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id,name,avatar_url')
    .in('id', uniqueIds);
  throwIfError(error);
  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

export async function fetchProfile(userId: string): Promise<ProfileInfo | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id,name,avatar_url,created_at')
    .eq('id', userId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function fetchPushNotificationsEnabled(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('has_push_notifications_enabled');
  throwIfError(error);
  return data ?? false;
}

export async function fetchUserItems(userId: string): Promise<ItemRow[]> {
  const { data, error } = await getSupabase()
    .from('items')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function fetchLoans(userId: string): Promise<LoanWithPeople[]> {
  const client = getSupabase();
  const { data: loans, error } = await client
    .from('loans')
    .select('*')
    .or(`owner_id.eq.${userId},borrower_id.eq.${userId}`)
    .order('requested_at', { ascending: false });
  throwIfError(error);
  const rows = loans ?? [];
  if (rows.length === 0) return [];

  const itemIds = [...new Set(rows.map((loan) => loan.item_id))];
  const { data: items, error: itemError } = await client
    .from('items')
    .select('*')
    .in('id', itemIds);
  throwIfError(itemError);
  const itemMap = new Map((items ?? []).map((item) => [item.id, item]));
  const people = await profilesByIds(
    rows.flatMap((loan) => [loan.owner_id, loan.borrower_id]),
  );

  return rows.map((loan) => ({
    ...loan,
    item: itemMap.get(loan.item_id) ?? null,
    owner: people.get(loan.owner_id) ?? null,
    borrower: people.get(loan.borrower_id) ?? null,
  }));
}

export async function fetchDashboard(userId: string) {
  const loans = await fetchLoans(userId);
  const active = loans.filter(
    (loan) => loan.status === 'handed_over' || loan.status === 'overdue',
  );
  return {
    lent: active.filter((loan) => loan.owner_id === userId).length,
    borrowed: active.filter((loan) => loan.borrower_id === userId).length,
    activeLoans: active,
  };
}

export async function fetchFriends(
  userId: string,
): Promise<{
  accepted: ConnectionWithFriend[];
  incoming: ConnectionWithFriend[];
  outgoing: ConnectionWithFriend[];
}> {
  const client = getSupabase();
  const { data, error } = await client
    .from('connections')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  throwIfError(error);
  const connections = (data ?? []) as ConnectionRow[];
  const otherIds = connections.map((connection) =>
    connection.user_id === userId ? connection.friend_id : connection.user_id,
  );
  const people = await profilesByIds(otherIds);
  const withFriends = connections.map((connection) => ({
    ...connection,
    friend: people.get(
      connection.user_id === userId ? connection.friend_id : connection.user_id,
    ) ?? null,
  }));
  return {
    accepted: withFriends.filter((connection) => connection.status === 'accepted'),
    incoming: withFriends.filter(
      (connection) =>
        connection.status === 'pending' && connection.friend_id === userId,
    ),
    outgoing: withFriends.filter(
      (connection) =>
        connection.status === 'pending' && connection.user_id === userId,
    ),
  };
}

export async function fetchExploreItems(userId: string): Promise<{
  items: ItemWithOwner[];
  friends: FriendProfile[];
}> {
  const { accepted } = await fetchFriends(userId);
  const friends = accepted
    .map((connection) => connection.friend)
    .filter((friend): friend is FriendProfile => friend !== null);
  if (friends.length === 0) return { items: [], friends: [] };

  const client = getSupabase();
  const { data, error } = await client
    .from('items')
    .select('*')
    .in(
      'owner_id',
      friends.map((friend) => friend.id),
    )
    .eq('is_available', true)
    .order('created_at', { ascending: false });
  throwIfError(error);
  const profiles = new Map(friends.map((friend) => [friend.id, friend]));
  return {
    items: (data ?? []).map((item) => ({
      ...item,
      owner: profiles.get(item.owner_id) ?? null,
    })),
    friends,
  };
}

export async function fetchItemWithOwner(id: string): Promise<ItemWithOwner | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error);
  if (!data) return null;
  const people = await profilesByIds([data.owner_id]);
  return { ...data, owner: people.get(data.owner_id) ?? null };
}

export async function findProfileByEmail(email: string): Promise<FriendProfile | null> {
  const { data, error } = await getSupabase().rpc('find_profile_by_email', {
    email_input: email.trim().toLowerCase(),
  });
  throwIfError(error);
  return data?.[0] ?? null;
}

export async function addFriendRequest(
  userId: string,
  friendId: string,
): Promise<void> {
  if (userId === friendId) throw new Error('CANNOT_ADD_SELF');
  const current = await fetchFriends(userId);
  if (
    [...current.accepted, ...current.incoming, ...current.outgoing].some(
      (connection) => connection.friend?.id === friendId,
    )
  ) {
    throw new Error('FRIEND_ALREADY_CONNECTED');
  }
  const { error } = await getSupabase().from('connections').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'pending',
  });
  throwIfError(error);
}

export async function acceptFriendRequest(connectionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('connections')
    .update({ status: 'accepted' })
    .eq('id', connectionId);
  throwIfError(error);
}

export async function requestLoan(
  item: ItemRow,
  borrowerId: string,
  durationDays: number,
): Promise<LoanRow> {
  const client = getSupabase();
  const { data, error } = await client
    .from('loans')
    .insert({
      item_id: item.id,
      owner_id: item.owner_id,
      borrower_id: borrowerId,
      duration_days: durationDays,
      status: 'requested',
    })
    .select('*')
    .single();
  throwIfError(error);
  if (!data) throw new Error('LOAN_CREATE_FAILED');

  const { error: notificationError } = await client.functions.invoke(
    'notify-loan',
    {
      body: {
        loan_id: data.id,
        title: t.notifications.requestTitle,
        body: t.notifications.requestBody,
      },
    },
  );
  if (notificationError) {
    // The loan remains saved; push delivery is best-effort if the function is not deployed.
  }
  return data;
}
