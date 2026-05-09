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
      ideas: {
        Row: {
          content: string
          created_at: string
          id: string
          market: string | null
          status: string
          tags: string[]
          ticker: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          market?: string | null
          status?: string
          tags?: string[]
          ticker?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          market?: string | null
          status?: string
          tags?: string[]
          ticker?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
