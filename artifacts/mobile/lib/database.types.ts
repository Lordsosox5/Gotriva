export type ProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
};

export type ProfileInfo = Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'created_at'>;

export type ItemRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string | null;
  condition: 'excellent' | 'good' | 'fair' | null;
  photo_url: string | null;
  is_available: boolean;
  created_at: string;
};

export type ConnectionRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type LoanStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'handed_over'
  | 'returned'
  | 'overdue';

export type LoanRow = {
  id: string;
  item_id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  duration_days: number;
  requested_at: string;
  due_at: string | null;
  returned_at: string | null;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        ProfileRow,
        Partial<ProfileRow> & { id: string },
        Partial<ProfileRow>
      >;
      items: TableDefinition<
        ItemRow,
        Omit<ItemRow, 'id' | 'created_at'> &
          Partial<Pick<ItemRow, 'id' | 'created_at'>>,
        Partial<ItemRow>
      >;
      connections: TableDefinition<
        ConnectionRow,
        Omit<ConnectionRow, 'id' | 'created_at'> &
          Partial<Pick<ConnectionRow, 'id' | 'created_at'>>,
        Partial<ConnectionRow>
      >;
      loans: TableDefinition<
        LoanRow,
        Omit<LoanRow, 'id' | 'requested_at' | 'due_at' | 'returned_at'> &
          Partial<Pick<LoanRow, 'id' | 'requested_at' | 'due_at' | 'returned_at'>>,
        Partial<LoanRow>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      find_profile_by_email: {
        Args: { email_input: string };
        Returns: Pick<ProfileRow, 'id' | 'name' | 'avatar_url'>[];
      };
      has_push_notifications_enabled: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      respond_to_loan: {
        Args: { p_loan_id: string; p_accept: boolean };
        Returns: undefined;
      };
      confirm_handover: {
        Args: { p_loan_id: string };
        Returns: undefined;
      };
      confirm_return: {
        Args: { p_loan_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type FriendProfile = Pick<ProfileRow, 'id' | 'name' | 'avatar_url'>;

export type LoanWithPeople = LoanRow & {
  item: ItemRow | null;
  owner: FriendProfile | null;
  borrower: FriendProfile | null;
};

export type ItemWithOwner = ItemRow & {
  owner: FriendProfile | null;
};

export type ConnectionWithFriend = ConnectionRow & {
  friend: FriendProfile | null;
};
