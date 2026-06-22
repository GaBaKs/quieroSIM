// ============================================================================
// GENERADO desde el esquema Supabase (proyecto dev) — NO EDITAR A MANO.
// Regenerar tras cada migración con el MCP `generate_typescript_types`
// (o `supabase gen types typescript`).
// Última generación: 2026-06-12 (post migración destinations_catalog/enable_cron).
// ============================================================================

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
      admin_profile: {
        Row: {
          id: string
          sub_role: string
          user_id: string
        }
        Insert: {
          id?: string
          sub_role: string
          user_id: string
        }
        Update: {
          id?: string
          sub_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_credit: {
        Row: {
          affiliate_profile_id: string
          amount: number
          created_at: string | null
          id: string
          movement_type: string | null
          order_id: string | null
        }
        Insert: {
          affiliate_profile_id: string
          amount: number
          created_at?: string | null
          id?: string
          movement_type?: string | null
          order_id?: string | null
        }
        Update: {
          affiliate_profile_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          movement_type?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_credit_affiliate_profile_id_fkey"
            columns: ["affiliate_profile_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_credit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_profile: {
        Row: {
          channel: string | null
          coupon_code: string | null
          created_at: string | null
          estimated_audience: number | null
          id: string
          referral_link: string | null
          referred_by_affiliate_id: string | null
          status: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          coupon_code?: string | null
          created_at?: string | null
          estimated_audience?: number | null
          id?: string
          referral_link?: string | null
          referred_by_affiliate_id?: string | null
          status?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          coupon_code?: string | null
          created_at?: string | null
          estimated_audience?: number | null
          id?: string
          referral_link?: string | null
          referred_by_affiliate_id?: string | null
          status?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_profile_referred_by_affiliate_id_fkey"
            columns: ["referred_by_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_profile: {
        Row: {
          approved_at: string | null
          billing_address: string | null
          company_name: string
          id: string
          status: string | null
          tax_id: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          billing_address?: string | null
          company_name: string
          id?: string
          status?: string | null
          tax_id?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          billing_address?: string | null
          company_name?: string
          id?: string
          status?: string | null
          tax_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          id: string
          occurred_at: string | null
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          id?: string
          occurred_at?: string | null
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          id?: string
          occurred_at?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_movement: {
        Row: {
          affiliate_profile_id: string
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          level: number | null
          order_id: string
          status: string | null
        }
        Insert: {
          affiliate_profile_id: string
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          level?: number | null
          order_id: string
          status?: string | null
        }
        Update: {
          affiliate_profile_id?: string
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          level?: number | null
          order_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_movement_affiliate_profile_id_fkey"
            columns: ["affiliate_profile_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_movement_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon: {
        Row: {
          affiliate_profile_id: string | null
          applicable_plan_ids: Json | null
          code: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses_global: number | null
          min_purchase_amount: number | null
          non_stackable: boolean | null
          single_use_global: boolean | null
          single_use_per_account: boolean | null
          starts_at: string | null
        }
        Insert: {
          affiliate_profile_id?: string | null
          applicable_plan_ids?: Json | null
          code: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses_global?: number | null
          min_purchase_amount?: number | null
          non_stackable?: boolean | null
          single_use_global?: boolean | null
          single_use_per_account?: boolean | null
          starts_at?: string | null
        }
        Update: {
          affiliate_profile_id?: string | null
          applicable_plan_ids?: Json | null
          code?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses_global?: number | null
          min_purchase_amount?: number | null
          non_stackable?: boolean | null
          single_use_global?: boolean | null
          single_use_per_account?: boolean | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_affiliate_profile_id_fkey"
            columns: ["affiliate_profile_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemption: {
        Row: {
          coupon_id: string
          id: string
          order_id: string
          redeemed_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id: string
          redeemed_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string
          redeemed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemption_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemption_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      destination: {
        Row: {
          code: string
          flag: string
          id: string
          iso_match: string | null
          name: string
          popular: boolean | null
          region: string
          search_aliases: Json
          slug: string
          sort_order: number | null
          status: string | null
        }
        Insert: {
          code: string
          flag: string
          id?: string
          iso_match?: string | null
          name: string
          popular?: boolean | null
          region: string
          search_aliases?: Json
          slug: string
          sort_order?: number | null
          status?: string | null
        }
        Update: {
          code?: string
          flag?: string
          id?: string
          iso_match?: string | null
          name?: string
          popular?: boolean | null
          region?: string
          search_aliases?: Json
          slug?: string
          sort_order?: number | null
          status?: string | null
        }
        Relationships: []
      }
      device_compat: {
        Row: {
          brand: string | null
          category: string | null
          id: string
          model: string | null
          synced_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          id?: string
          model?: string | null
          synced_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          id?: string
          model?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      esim: {
        Row: {
          agency_profile_id: string | null
          created_at: string | null
          data_left_mb: number | null
          data_package_mb: number | null
          data_used_mb: number | null
          esim_passport_url: string | null
          iccid: string | null
          id: string
          ios_tap_link: string | null
          order_id: string
          plan_activated_at: string | null
          plan_expired_at: string | null
          qr_img_path: string | null
          qr_lpa: string | null
          status_qr: string | null
          usage_synced_at: string | null
          user_id: string | null
          yesim_status_raw: string | null
          yesim_user_id: string | null
        }
        Insert: {
          agency_profile_id?: string | null
          created_at?: string | null
          data_left_mb?: number | null
          data_package_mb?: number | null
          data_used_mb?: number | null
          esim_passport_url?: string | null
          iccid?: string | null
          id?: string
          ios_tap_link?: string | null
          order_id: string
          plan_activated_at?: string | null
          plan_expired_at?: string | null
          qr_img_path?: string | null
          qr_lpa?: string | null
          status_qr?: string | null
          usage_synced_at?: string | null
          user_id?: string | null
          yesim_status_raw?: string | null
          yesim_user_id?: string | null
        }
        Update: {
          agency_profile_id?: string | null
          created_at?: string | null
          data_left_mb?: number | null
          data_package_mb?: number | null
          data_used_mb?: number | null
          esim_passport_url?: string | null
          iccid?: string | null
          id?: string
          ios_tap_link?: string | null
          order_id?: string
          plan_activated_at?: string | null
          plan_expired_at?: string | null
          qr_img_path?: string | null
          qr_lpa?: string | null
          status_qr?: string | null
          usage_synced_at?: string | null
          user_id?: string | null
          yesim_status_raw?: string | null
          yesim_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esim_agency_profile_id_fkey"
            columns: ["agency_profile_id"]
            isOneToOne: false
            referencedRelation: "agency_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esim_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esim_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_consent: {
        Row: {
          action: string
          categories_accepted: Json
          consented_at: string | null
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          action: string
          categories_accepted: Json
          consented_at?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          action?: string
          categories_accepted?: Json
          consented_at?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article: {
        Row: {
          category: string | null
          content: string
          embedding: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          embedding?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          embedding?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order: {
        Row: {
          affiliate_credit_applied: number | null
          affiliate_profile_id: string | null
          channel: string | null
          coupon_id: string | null
          created_at: string | null
          currency_sale: string | null
          discount_applied: number | null
          fx_rate_eur: number | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          lang: string
          plan_id: string
          price_paid: number
          status: string | null
          stripe_payment_intent_id: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_credit_applied?: number | null
          affiliate_profile_id?: string | null
          channel?: string | null
          coupon_id?: string | null
          created_at?: string | null
          currency_sale?: string | null
          discount_applied?: number | null
          fx_rate_eur?: number | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          lang?: string
          plan_id: string
          price_paid: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_credit_applied?: number | null
          affiliate_profile_id?: string | null
          channel?: string | null
          coupon_id?: string | null
          created_at?: string | null
          currency_sale?: string | null
          discount_applied?: number | null
          fx_rate_eur?: number | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          lang?: string
          plan_id?: string
          price_paid?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_affiliate_profile_id_fkey"
            columns: ["affiliate_profile_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      plan: {
        Row: {
          country_region: string | null
          currency: string | null
          data_amount: string | null
          duration_days: number | null
          fup_threshold_gb: number | null
          id: string
          is_fup: boolean | null
          iso_country: string | null
          last_sync_at: string | null
          name: string
          operators: string | null
          plan_type: string | null
          retail_price_ref: number | null
          status: string | null
          yesim_id: string
          yesim_old_id: number | null
        }
        Insert: {
          country_region?: string | null
          currency?: string | null
          data_amount?: string | null
          duration_days?: number | null
          fup_threshold_gb?: number | null
          id?: string
          is_fup?: boolean | null
          iso_country?: string | null
          last_sync_at?: string | null
          name: string
          operators?: string | null
          plan_type?: string | null
          retail_price_ref?: number | null
          status?: string | null
          yesim_id: string
          yesim_old_id?: number | null
        }
        Update: {
          country_region?: string | null
          currency?: string | null
          data_amount?: string | null
          duration_days?: number | null
          fup_threshold_gb?: number | null
          id?: string
          is_fup?: boolean | null
          iso_country?: string | null
          last_sync_at?: string | null
          name?: string
          operators?: string | null
          plan_type?: string | null
          retail_price_ref?: number | null
          status?: string | null
          yesim_id?: string
          yesim_old_id?: number | null
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          cost_provider_eur: number
          id: string
          margin_pct: number
          plan_id: string
          price_final: number
          price_fixed: number | null
          price_wholesale: number | null
          updated_at: string | null
          use_fixed_price: boolean | null
        }
        Insert: {
          cost_provider_eur: number
          id?: string
          margin_pct: number
          plan_id: string
          price_final: number
          price_fixed?: number | null
          price_wholesale?: number | null
          updated_at?: string | null
          use_fixed_price?: boolean | null
        }
        Update: {
          cost_provider_eur?: number
          id?: string
          margin_pct?: number
          plan_id?: string
          price_final?: number
          price_fixed?: number | null
          price_wholesale?: number | null
          updated_at?: string | null
          use_fixed_price?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_at: string | null
          id: string
          new_value: number
          old_value: number | null
          origin: string | null
          plan_id: string
        }
        Insert: {
          changed_at?: string | null
          id?: string
          new_value: number
          old_value?: number | null
          origin?: string | null
          plan_id: string
        }
        Update: {
          changed_at?: string | null
          id?: string
          new_value?: number
          old_value?: number | null
          origin?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      provision_job: {
        Row: {
          attempt_count: number
          created_at: string | null
          history: Json
          id: string
          last_error: string | null
          locked_at: string | null
          order_id: string
          state: string
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string | null
          history?: Json
          id?: string
          last_error?: string | null
          locked_at?: string | null
          order_id: string
          state?: string
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string | null
          history?: Json
          id?: string
          last_error?: string | null
          locked_at?: string | null
          order_id?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provision_job_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_delivery: {
        Row: {
          channel: string | null
          esim_id: string
          id: string
          lang_used: string | null
          last_attempt_at: string | null
          last_error: string | null
          provider_message_id: string | null
          resend_count: number | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          esim_id: string
          id?: string
          lang_used?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          provider_message_id?: string | null
          resend_count?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          esim_id?: string
          id?: string
          lang_used?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          provider_message_id?: string | null
          resend_count?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_delivery_esim_id_fkey"
            columns: ["esim_id"]
            isOneToOne: false
            referencedRelation: "esim"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_l1_pct: number | null
          commission_l2_pct: number | null
          default_margin_pct: number | null
          id: number
          min_withdrawal_usd: number | null
          price_alert_threshold_pct: number | null
          updated_at: string | null
          wholesale_margin_pct: number | null
        }
        Insert: {
          commission_l1_pct?: number | null
          commission_l2_pct?: number | null
          default_margin_pct?: number | null
          id?: number
          min_withdrawal_usd?: number | null
          price_alert_threshold_pct?: number | null
          updated_at?: string | null
          wholesale_margin_pct?: number | null
        }
        Update: {
          commission_l1_pct?: number | null
          commission_l2_pct?: number | null
          default_margin_pct?: number | null
          id?: number
          min_withdrawal_usd?: number | null
          price_alert_threshold_pct?: number | null
          updated_at?: string | null
          wholesale_margin_pct?: number | null
        }
        Relationships: []
      }
      role: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      stripe_event: {
        Row: {
          event_type: string
          id: string
          processing_result: string | null
          received_at: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          processing_result?: string | null
          received_at?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          processing_result?: string | null
          received_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      support_ticket: {
        Row: {
          bot_conversation_history: Json | null
          channel: string | null
          created_at: string | null
          id: string
          order_id: string | null
          priority: string | null
          resolved_at: string | null
          sla_deadline: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          bot_conversation_history?: Json | null
          channel?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          bot_conversation_history?: Json | null
          channel?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      unresolved_query: {
        Row: {
          category: string | null
          frequency: number | null
          id: string
          last_seen_at: string | null
          query_text: string
          suggested_for_faq: boolean | null
        }
        Insert: {
          category?: string | null
          frequency?: number | null
          id?: string
          last_seen_at?: string | null
          query_text: string
          suggested_for_faq?: boolean | null
        }
        Update: {
          category?: string | null
          frequency?: number | null
          id?: string
          last_seen_at?: string | null
          query_text?: string
          suggested_for_faq?: boolean | null
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          account_status: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          lang_pref: string | null
          phone_whatsapp: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          lang_pref?: string | null
          phone_whatsapp?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          lang_pref?: string | null
          phone_whatsapp?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_role: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_request: {
        Row: {
          affiliate_profile_id: string
          amount: number
          id: string
          paid_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          affiliate_profile_id: string
          amount: number
          id?: string
          paid_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          affiliate_profile_id?: string
          amount?: number
          id?: string
          paid_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_request_affiliate_profile_id_fkey"
            columns: ["affiliate_profile_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      yesim_webhook_event: {
        Row: {
          event_type: string
          iccid: string | null
          id: string
          payload: Json
          processing_result: string | null
          received_at: string | null
        }
        Insert: {
          event_type: string
          iccid?: string | null
          id?: string
          payload: Json
          processing_result?: string | null
          received_at?: string | null
        }
        Update: {
          event_type?: string
          iccid?: string | null
          id?: string
          payload?: Json
          processing_result?: string | null
          received_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      catalog_pricing: {
        Row: {
          plan_id: string | null
          price_final: number | null
        }
        Insert: {
          plan_id?: string | null
          price_final?: number | null
        }
        Update: {
          plan_id?: string | null
          price_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_dashboard_metrics: { Args: never; Returns: Json }
      admin_top_plans: {
        Args: { p_limit?: number }
        Returns: { plan_id: string; name: string; units: number; revenue: number }[]
      }
      admin_sales_series: {
        Args: { p_days?: number }
        Returns: { day: string; total: number }[]
      }
      admin_sales_report: { Args: { p_days?: number }; Returns: Json }
      admin_finance_report: { Args: { p_months?: number }; Returns: Json }
      admin_refunds_report: {
        Args: { p_limit?: number }
        Returns: { order_id: string; customer: string; amount: number; refunded_at: string; admin_email: string }[]
      }
      admin_grant_admin: { Args: { p_email: string; p_sub_role: string }; Returns: Json }
      admin_set_admin_sub_role: { Args: { p_user_id: string; p_sub_role: string }; Returns: Json }
      admin_revoke_admin: { Args: { p_user_id: string }; Returns: Json }
      claim_my_orders: { Args: never; Returns: number }
      claim_order: { Args: { p_order_ref: string; p_email: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_admin_action: { Args: { p_action: string; p_payload?: Json }; Returns: undefined }
      redeem_coupon: { Args: { p_coupon_id: string; p_order_id: string }; Returns: boolean }
      validate_coupon: {
        Args: { p_code: string; p_plan_id: string; p_subtotal: number; p_user_id?: string; p_email?: string }
        Returns: Json
      }
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
