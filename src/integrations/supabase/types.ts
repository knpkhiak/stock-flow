export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_settings: {
        Row: {
          created_at: string
          is_connected: boolean
          kis_account_number: string | null
          kis_account_type: string
          kis_app_key: string | null
          kis_app_secret: string | null
          last_connected_at: string | null
          last_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_connected?: boolean
          kis_account_number?: string | null
          kis_account_type?: string
          kis_app_key?: string | null
          kis_app_secret?: string | null
          last_connected_at?: string | null
          last_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_connected?: boolean
          kis_account_number?: string | null
          kis_account_type?: string
          kis_app_key?: string | null
          kis_app_secret?: string | null
          last_connected_at?: string | null
          last_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_snapshots: {
        Row: {
          cash_balance: number
          created_at: string
          id: string
          longterm_balance: number
          memo: string | null
          snapshot_date: string
          source: string
          total_balance: number
          trading_balance: number
          user_id: string
        }
        Insert: {
          cash_balance?: number
          created_at?: string
          id?: string
          longterm_balance?: number
          memo?: string | null
          snapshot_date: string
          source?: string
          total_balance?: number
          trading_balance?: number
          user_id?: string
        }
        Update: {
          cash_balance?: number
          created_at?: string
          id?: string
          longterm_balance?: number
          memo?: string | null
          snapshot_date?: string
          source?: string
          total_balance?: number
          trading_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      board_posts: {
        Row: {
          author_id: string
          comment_count: number
          content: Json
          created_at: string
          id: string
          like_count: number
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          comment_count?: number
          content?: Json
          created_at?: string
          id?: string
          like_count?: number
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          comment_count?: number
          content?: Json
          created_at?: string
          id?: string
          like_count?: number
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          memo: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          memo?: string | null
          transaction_date: string
          type: string
          user_id?: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          memo?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          comment_count: number
          content: Json
          created_at: string
          id: string
          is_shared: boolean
          like_count: number
          market: string | null
          share_pnl_rate: boolean
          shared_at: string | null
          status: string
          tags: string[]
          ticker: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_count?: number
          content?: Json
          created_at?: string
          id?: string
          is_shared?: boolean
          like_count?: number
          market?: string | null
          share_pnl_rate?: boolean
          shared_at?: string | null
          status?: string
          tags?: string[]
          ticker?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          comment_count?: number
          content?: Json
          created_at?: string
          id?: string
          is_shared?: boolean
          like_count?: number
          market?: string | null
          share_pnl_rate?: boolean
          shared_at?: string | null
          status?: string
          tags?: string[]
          ticker?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_master: boolean
          is_used: boolean
          memo: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_master?: boolean
          is_used?: boolean
          memo?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_master?: boolean
          is_used?: boolean
          memo?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      kis_sync_log: {
        Row: {
          created_at: string
          id: string
          last_processed_order_id: string | null
          last_sync_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_processed_order_id?: string | null
          last_sync_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_processed_order_id?: string | null
          last_sync_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kis_token_cache: {
        Row: {
          access_token: string
          env: string
          expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          env: string
          expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          env?: string
          expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      longterm_buys: {
        Row: {
          buy_date: string
          buy_price: number
          buy_quantity: number
          created_at: string
          holding_id: string
          id: string
          memo: string | null
          user_id: string
        }
        Insert: {
          buy_date: string
          buy_price: number
          buy_quantity: number
          created_at?: string
          holding_id: string
          id?: string
          memo?: string | null
          user_id?: string
        }
        Update: {
          buy_date?: string
          buy_price?: number
          buy_quantity?: number
          created_at?: string
          holding_id?: string
          id?: string
          memo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "longterm_buys_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "longterm_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      longterm_holdings: {
        Row: {
          avg_entry_price: number
          created_at: string
          first_buy_date: string
          id: string
          market: string
          memo: string | null
          name: string
          remaining_quantity: number
          ticker: string
          total_quantity: number
          user_id: string
        }
        Insert: {
          avg_entry_price?: number
          created_at?: string
          first_buy_date: string
          id?: string
          market: string
          memo?: string | null
          name: string
          remaining_quantity?: number
          ticker: string
          total_quantity?: number
          user_id?: string
        }
        Update: {
          avg_entry_price?: number
          created_at?: string
          first_buy_date?: string
          id?: string
          market?: string
          memo?: string | null
          name?: string
          remaining_quantity?: number
          ticker?: string
          total_quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      longterm_sells: {
        Row: {
          created_at: string
          holding_id: string
          id: string
          memo: string | null
          pnl_rate: number
          realized_pnl: number
          sell_date: string
          sell_price: number
          sell_quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          holding_id: string
          id?: string
          memo?: string | null
          pnl_rate?: number
          realized_pnl?: number
          sell_date: string
          sell_price: number
          sell_quantity: number
          user_id?: string
        }
        Update: {
          created_at?: string
          holding_id?: string
          id?: string
          memo?: string | null
          pnl_rate?: number
          realized_pnl?: number
          sell_date?: string
          sell_price?: number
          sell_quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "longterm_sells_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "longterm_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_buys: {
        Row: {
          buy_amount: number
          buy_date: string
          buy_price: number
          buy_quantity: number
          created_at: string
          cumulative_avg_price: number
          id: string
          kis_order_id: string | null
          source: string
          trade_id: string
          user_id: string
        }
        Insert: {
          buy_amount: number
          buy_date: string
          buy_price: number
          buy_quantity: number
          created_at?: string
          cumulative_avg_price: number
          id?: string
          kis_order_id?: string | null
          source?: string
          trade_id: string
          user_id?: string
        }
        Update: {
          buy_amount?: number
          buy_date?: string
          buy_price?: number
          buy_quantity?: number
          created_at?: string
          cumulative_avg_price?: number
          id?: string
          kis_order_id?: string | null
          source?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_buys_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_closes: {
        Row: {
          close_date: string
          close_price: number
          close_quantity: number
          created_at: string
          holding_days: number
          id: string
          kis_order_id: string | null
          memo: string | null
          pnl_rate: number
          realized_pnl: number
          source: string
          trade_id: string
          user_id: string
        }
        Insert: {
          close_date: string
          close_price: number
          close_quantity: number
          created_at?: string
          holding_days: number
          id?: string
          kis_order_id?: string | null
          memo?: string | null
          pnl_rate: number
          realized_pnl: number
          source?: string
          trade_id: string
          user_id?: string
        }
        Update: {
          close_date?: string
          close_price?: number
          close_quantity?: number
          created_at?: string
          holding_days?: number
          id?: string
          kis_order_id?: string | null
          memo?: string | null
          pnl_rate?: number
          realized_pnl?: number
          source?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_closes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          avg_close_price: number | null
          created_at: string
          entry_date: string
          entry_price: number
          id: string
          idea_id: string | null
          kis_order_id: string | null
          market: string
          memo: string | null
          name: string
          remaining_quantity: number
          source: string
          status: string
          stop_loss: number | null
          ticker: string
          total_quantity: number
          total_realized_pnl: number | null
          user_id: string
        }
        Insert: {
          avg_close_price?: number | null
          created_at?: string
          entry_date: string
          entry_price: number
          id?: string
          idea_id?: string | null
          kis_order_id?: string | null
          market: string
          memo?: string | null
          name: string
          remaining_quantity?: number
          source?: string
          status?: string
          stop_loss?: number | null
          ticker: string
          total_quantity: number
          total_realized_pnl?: number | null
          user_id?: string
        }
        Update: {
          avg_close_price?: number | null
          created_at?: string
          entry_date?: string
          entry_price?: number
          id?: string
          idea_id?: string | null
          kis_order_id?: string | null
          market?: string
          memo?: string | null
          name?: string
          remaining_quantity?: number
          source?: string
          status?: string
          stop_loss?: number | null
          ticker?: string
          total_quantity?: number
          total_realized_pnl?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          is_admin: boolean
          nickname: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          is_admin?: boolean
          nickname: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          is_admin?: boolean
          nickname?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          api_connected: boolean
          created_at: string
          email: string
          is_admin: boolean
          last_sign_in_at: string
          nickname: string
          user_id: string
        }[]
      }
      change_nickname: { Args: { new_nickname: string }; Returns: undefined }
      increment_post_view: { Args: { p_post_id: string }; Returns: undefined }
      set_user_admin: {
        Args: { p_is_admin: boolean; p_target_user_id: string }
        Returns: undefined
      }
      toggle_like: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: Json
      }
      use_invite_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: undefined
      }
      verify_invite_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
