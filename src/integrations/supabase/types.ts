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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_install_events: {
        Row: {
          app_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_install_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          apk_url: string | null
          audiences: string[]
          banner_url: string | null
          build_number: number
          category_id: string | null
          changelog: string
          created_at: string
          description: string
          file_size: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          package_name: string
          screenshots: string[]
          tier: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          apk_url?: string | null
          audiences?: string[]
          banner_url?: string | null
          build_number?: number
          category_id?: string | null
          changelog?: string
          created_at?: string
          description?: string
          file_size?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          package_name?: string
          screenshots?: string[]
          tier?: string
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          apk_url?: string | null
          audiences?: string[]
          banner_url?: string | null
          build_number?: number
          category_id?: string | null
          changelog?: string
          created_at?: string
          description?: string
          file_size?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          package_name?: string
          screenshots?: string[]
          tier?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_boss: boolean
          is_vip: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_boss?: boolean
          is_vip?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_boss?: boolean
          is_vip?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      m3u_settings: {
        Row: {
          allowed_hosts: string[]
          enabled: boolean
          id: number
          min_connections: number
          reject_expired: boolean
          require_active_status: boolean
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          allowed_hosts?: string[]
          enabled?: boolean
          id?: number
          min_connections?: number
          reject_expired?: boolean
          require_active_status?: boolean
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          allowed_hosts?: string[]
          enabled?: boolean
          id?: number
          min_connections?: number
          reject_expired?: boolean
          require_active_status?: boolean
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      remote_actions: {
        Row: {
          audiences: string[]
          command: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          label: string
          needs_confirmation: boolean
          needs_package: boolean
          sort_order: number
        }
        Insert: {
          audiences?: string[]
          command: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          label: string
          needs_confirmation?: boolean
          needs_package?: boolean
          sort_order?: number
        }
        Update: {
          audiences?: string[]
          command?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          needs_confirmation?: boolean
          needs_package?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      storage_settings: {
        Row: {
          access_key_id: string | null
          account_id: string | null
          bucket: string | null
          enabled: boolean
          id: number
          public_base_url: string | null
          secret_access_key: string | null
          updated_at: string
        }
        Insert: {
          access_key_id?: string | null
          account_id?: string | null
          bucket?: string | null
          enabled?: boolean
          id?: number
          public_base_url?: string | null
          secret_access_key?: string | null
          updated_at?: string
        }
        Update: {
          access_key_id?: string | null
          account_id?: string | null
          bucket?: string | null
          enabled?: boolean
          id?: number
          public_base_url?: string | null
          secret_access_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_broadcast: {
        Row: {
          id: number
          is_active: boolean
          message: string
          style: string
          updated_at: string
        }
        Insert: {
          id?: number
          is_active?: boolean
          message?: string
          style?: string
          updated_at?: string
        }
        Update: {
          id?: number
          is_active?: boolean
          message?: string
          style?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_release: {
        Row: {
          apk_url: string | null
          build_number: number
          changelog: string
          id: number
          is_mandatory: boolean
          updated_at: string
          version: string
        }
        Insert: {
          apk_url?: string | null
          build_number?: number
          changelog?: string
          id?: number
          is_mandatory?: boolean
          updated_at?: string
          version?: string
        }
        Update: {
          apk_url?: string | null
          build_number?: number
          changelog?: string
          id?: number
          is_mandatory?: boolean
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_credentials: {
        Row: {
          active: boolean
          external_id: string | null
          id: string
          note: string
          password: string
          synced_at: string
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          external_id?: string | null
          id?: string
          note?: string
          password?: string
          synced_at?: string
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          external_id?: string | null
          id?: string
          note?: string
          password?: string
          synced_at?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      vault_sync_meta: {
        Row: {
          id: number
          last_event_at: string | null
          last_ping_at: string | null
        }
        Insert: {
          id?: number
          last_event_at?: string | null
          last_ping_at?: string | null
        }
        Update: {
          id?: number
          last_event_at?: string | null
          last_ping_at?: string | null
        }
        Relationships: []
      }
      vault_sync_settings: {
        Row: {
          active_count: number | null
          api_key: string | null
          enabled: boolean
          id: number
          key_name: string | null
          last_error: string | null
          last_error_at: string | null
          last_synced_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active_count?: number | null
          api_key?: string | null
          enabled?: boolean
          id?: number
          key_name?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_synced_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active_count?: number | null
          api_key?: string | null
          enabled?: boolean
          id?: number
          key_name?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_synced_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      vip_codes: {
        Row: {
          code: string
          created_at: string
          device_limit: number
          devices: string[]
          expires_at: string | null
          id: string
          note: string
          revoked: boolean
        }
        Insert: {
          code: string
          created_at?: string
          device_limit?: number
          devices?: string[]
          expires_at?: string | null
          id?: string
          note?: string
          revoked?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          device_limit?: number
          devices?: string[]
          expires_at?: string | null
          id?: string
          note?: string
          revoked?: boolean
        }
        Relationships: []
      }
      vip_members: {
        Row: {
          code_id: string | null
          expires_at: string | null
          granted_at: string
          user_id: string
        }
        Insert: {
          code_id?: string | null
          expires_at?: string | null
          granted_at?: string
          user_id: string
        }
        Update: {
          code_id?: string | null
          expires_at?: string | null
          granted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_members_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "vip_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_browse_app: {
        Args: { _audiences: string[]; _category_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_vip: { Args: { _user_id: string }; Returns: boolean }
      redeem_vip_code: {
        Args: { _code: string; _device: string }
        Returns: Json
      }
      redeem_vip_for_me: { Args: { _code: string }; Returns: Json }
      user_level: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
