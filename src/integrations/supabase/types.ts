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
      bot_sessions: {
        Row: {
          balance_after: number | null
          balance_before: number | null
          created_at: string
          failure_reason: string | null
          id: string
          last_tick_at: string | null
          ledger_id: string | null
          loss_count: number
          max_loss_cap: number
          max_profit_cap: number
          net_result: number | null
          realized_pnl: number
          settled_at: string | null
          stake_amount: number
          started_at: string
          status: string
          trade_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          last_tick_at?: string | null
          ledger_id?: string | null
          loss_count?: number
          max_loss_cap: number
          max_profit_cap: number
          net_result?: number | null
          realized_pnl?: number
          settled_at?: string | null
          stake_amount: number
          started_at?: string
          status?: string
          trade_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          last_tick_at?: string | null
          ledger_id?: string | null
          loss_count?: number
          max_loss_cap?: number
          max_profit_cap?: number
          net_result?: number | null
          realized_pnl?: number
          settled_at?: string | null
          stake_amount?: number
          started_at?: string
          status?: string
          trade_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_trades: {
        Row: {
          action: string
          asset: string
          created_at: string
          entry_price: number
          exit_price: number
          id: string
          is_win: boolean
          profit_usd: number
          session_id: string
          user_id: string
        }
        Insert: {
          action: string
          asset: string
          created_at?: string
          entry_price: number
          exit_price: number
          id?: string
          is_win: boolean
          profit_usd: number
          session_id: string
          user_id: string
        }
        Update: {
          action?: string
          asset?: string
          created_at?: string
          entry_price?: number
          exit_price?: number
          id?: string
          is_win?: boolean
          profit_usd?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          address: string
          amount: number
          created_at: string
          id: string
          network: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          address: string
          amount: number
          created_at?: string
          id?: string
          network: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          address?: string
          amount?: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_delivery_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          email_type: string
          environment: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          provider: string | null
          provider_message_id: string | null
          provider_status: string | null
          recipient: string
          sender: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email_type: string
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          recipient: string
          sender?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          recipient?: string
          sender?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mpesa_deposits: {
        Row: {
          amount_kes: number
          checkout_request_id: string | null
          completed_at: string | null
          created_at: string
          credited: boolean
          credited_amount_usd: number
          credited_at: string | null
          exchange_rate: number
          failure_reason: string | null
          fee_kes: number
          id: string
          internal_reference: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          phone: string
          provider_reference: string | null
          provider_response: Json | null
          status: string
          total_paid_kes: number
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          amount_kes: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          credited?: boolean
          credited_amount_usd: number
          credited_at?: string | null
          exchange_rate: number
          failure_reason?: string | null
          fee_kes?: number
          id?: string
          internal_reference: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone: string
          provider_reference?: string | null
          provider_response?: Json | null
          status?: string
          total_paid_kes: number
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          amount_kes?: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          credited?: boolean
          credited_amount_usd?: number
          credited_at?: string | null
          exchange_rate?: number
          failure_reason?: string | null
          fee_kes?: number
          id?: string
          internal_reference?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone?: string
          provider_reference?: string | null
          provider_response?: Json | null
          status?: string
          total_paid_kes?: number
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mpesa_settings: {
        Row: {
          daily_withdrawal_limit_kes: number
          deposit_fee_kes: number
          deposits_enabled: boolean
          id: boolean
          kes_to_usd_rate: number
          max_withdrawal_kes: number
          min_deposit_kes: number
          min_withdrawal_kes: number
          updated_at: string
          usd_to_kes_rate: number
          withdrawal_fee_fixed_kes: number
          withdrawal_fee_percent: number
          withdrawals_enabled: boolean
        }
        Insert: {
          daily_withdrawal_limit_kes?: number
          deposit_fee_kes?: number
          deposits_enabled?: boolean
          id?: boolean
          kes_to_usd_rate?: number
          max_withdrawal_kes?: number
          min_deposit_kes?: number
          min_withdrawal_kes?: number
          updated_at?: string
          usd_to_kes_rate?: number
          withdrawal_fee_fixed_kes?: number
          withdrawal_fee_percent?: number
          withdrawals_enabled?: boolean
        }
        Update: {
          daily_withdrawal_limit_kes?: number
          deposit_fee_kes?: number
          deposits_enabled?: boolean
          id?: boolean
          kes_to_usd_rate?: number
          max_withdrawal_kes?: number
          min_deposit_kes?: number
          min_withdrawal_kes?: number
          updated_at?: string
          usd_to_kes_rate?: number
          withdrawal_fee_fixed_kes?: number
          withdrawal_fee_percent?: number
          withdrawals_enabled?: boolean
        }
        Relationships: []
      }
      mpesa_withdrawals: {
        Row: {
          amount_usd: number
          approved_at: string | null
          balance_deducted: boolean
          balance_reserved: boolean
          completed_at: string | null
          created_at: string
          exchange_rate: number
          failed_at: string | null
          failure_reason: string | null
          fee_kes: number
          gross_amount_kes: number
          id: string
          internal_reference: string
          mpesa_receipt: string | null
          net_amount_kes: number
          phone: string
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          provider_response: Json | null
          refunded: boolean
          refunded_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          amount_usd: number
          approved_at?: string | null
          balance_deducted?: boolean
          balance_reserved?: boolean
          completed_at?: string | null
          created_at?: string
          exchange_rate: number
          failed_at?: string | null
          failure_reason?: string | null
          fee_kes?: number
          gross_amount_kes: number
          id?: string
          internal_reference: string
          mpesa_receipt?: string | null
          net_amount_kes: number
          phone: string
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          provider_response?: Json | null
          refunded?: boolean
          refunded_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number
          approved_at?: string | null
          balance_deducted?: boolean
          balance_reserved?: boolean
          completed_at?: string | null
          created_at?: string
          exchange_rate?: number
          failed_at?: string | null
          failure_reason?: string | null
          fee_kes?: number
          gross_amount_kes?: number
          id?: string
          internal_reference?: string
          mpesa_receipt?: string | null
          net_amount_kes?: number
          phone?: string
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          provider_response?: Json | null
          refunded?: boolean
          refunded_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          trade_count: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          trade_count?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          trade_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount_usd: number
          balance_after: number
          created_at: string
          entry_type: string
          id: string
          memo: string | null
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          amount_usd: number
          balance_after: number
          created_at?: string
          entry_type: string
          id?: string
          memo?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number
          balance_after?: number
          created_at?: string
          entry_type?: string
          id?: string
          memo?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          network: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          updated_at: string
          user_email: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          network: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_email?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_email?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_deposit: {
        Args: { _deposit_id: string }
        Returns: undefined
      }
      admin_approve_withdrawal: {
        Args: { _withdrawal_id: string }
        Returns: undefined
      }
      admin_complete_mpesa_withdrawal: {
        Args: {
          _mpesa_receipt: string
          _provider_reference: string
          _withdrawal_id: string
        }
        Returns: undefined
      }
      admin_refund_mpesa_withdrawal: {
        Args: { _reason: string; _withdrawal_id: string }
        Returns: undefined
      }
      admin_reject_deposit: {
        Args: { _deposit_id: string }
        Returns: undefined
      }
      admin_reject_withdrawal: {
        Args: { _withdrawal_id: string }
        Returns: undefined
      }
      admin_verify_manual_mpesa_deposit: {
        Args: { _approve: boolean; _deposit_id: string; _reason?: string }
        Returns: undefined
      }
      attach_mpesa_provider_ids: {
        Args: {
          _checkout_request_id: string
          _failure_reason: string
          _internal_reference: string
          _merchant_request_id: string
          _provider_reference: string
          _provider_response: Json
          _status: string
        }
        Returns: undefined
      }
      credit_mpesa_deposit: {
        Args: {
          _internal_reference: string
          _mpesa_receipt: string
          _provider_reference: string
          _provider_response: Json
        }
        Returns: undefined
      }
      expire_stuck_mpesa_deposits: {
        Args: { _older_than_seconds?: number }
        Returns: number
      }
      fail_mpesa_deposit: {
        Args: { _internal_reference: string; _reason: string; _response: Json }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_my_trade_count: { Args: never; Returns: number }
      record_bot_trade: {
        Args: {
          _action: string
          _asset: string
          _entry: number
          _exit: number
          _is_win: boolean
          _profit: number
          _session_id: string
        }
        Returns: Json
      }
      recover_stuck_bot_sessions: {
        Args: { _older_than_seconds?: number }
        Returns: number
      }
      reserve_mpesa_withdrawal: {
        Args: {
          _amount_usd: number
          _exchange_rate: number
          _fee_kes: number
          _gross_kes: number
          _internal_reference: string
          _net_kes: number
          _phone: string
        }
        Returns: string
      }
      resolve_mpesa_deposit_ref: {
        Args: {
          _checkout_request_id: string
          _internal_reference: string
          _provider_reference: string
        }
        Returns: string
      }
      settle_bot_session: { Args: { _session_id: string }; Returns: Json }
      start_bot_session: { Args: { _stake: number }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      txn_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "awaiting_confirmation"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      txn_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "awaiting_confirmation",
      ],
    },
  },
} as const
