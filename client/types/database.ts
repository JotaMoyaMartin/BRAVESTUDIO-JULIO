export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          salon_name: string | null
          is_active: boolean
          role: 'user' | 'admin' | 'superadmin' | 'premium'
          access_status: 'active' | 'inactive'
          access_source: 'manual' | 'stripe' | 'skool' | 'promo' | 'none'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | null
          subscription_plan: 'monthly' | 'yearly' | null
          promo_code_used: string | null
          access_expires_at: string | null
          city: string | null
          professional_role: string | null
          last_visited_section: string | null
          level: number
          xp_total: number
          activated_by: string | null
          activated_at: string | null
          signup_method: 'signup' | 'admin_create' | 'skool' | 'stripe_checkout' | 'promo'
          trial_started_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          salon_name?: string | null
          is_active?: boolean
          role?: 'user' | 'admin' | 'superadmin'
          access_status?: 'active' | 'inactive'
          access_source?: 'manual' | 'stripe' | 'skool' | 'promo' | 'none'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | null
          subscription_plan?: 'monthly' | 'yearly' | null
          promo_code_used?: string | null
          access_expires_at?: string | null
          city?: string | null
          professional_role?: string | null
          last_visited_section?: string | null
          level?: number
          xp_total?: number
          activated_by?: string | null
          activated_at?: string | null
          signup_method?: 'signup' | 'admin_create' | 'skool' | 'stripe_checkout' | 'promo'
          trial_started_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          salon_name?: string | null
          is_active?: boolean
          role?: 'user' | 'admin' | 'superadmin'
          access_status?: 'active' | 'inactive'
          access_source?: 'manual' | 'stripe' | 'skool' | 'promo' | 'none'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | null
          subscription_plan?: 'monthly' | 'yearly' | null
          promo_code_used?: string | null
          access_expires_at?: string | null
          city?: string | null
          professional_role?: string | null
          last_visited_section?: string | null
          level?: number
          xp_total?: number
          activated_by?: string | null
          activated_at?: string | null
          signup_method?: 'signup' | 'admin_create' | 'skool' | 'stripe_checkout' | 'promo'
          trial_started_at?: string | null
          updated_at?: string
        }
      }
      brand_profiles: {
        Row: {
          id: string
          user_id: string
          raw_input: string | null
          salon_name: string | null
          city: string | null
          years_experience: string | null
          team_info: string | null
          services: string[] | null
          main_services: string[] | null
          most_profitable_service: string | null
          service_to_promote: string | null
          ideal_client: string | null
          ideal_client_age: string | null
          client_problems: string | null
          client_desires: string | null
          frequent_questions: string | null
          frequent_mistakes: string | null
          main_goal: string | null
          differentiation: string | null
          specialty: string | null
          content_topics: string[] | null
          optimized_summary: string | null
          strategy_json: Record<string, unknown> | null
          roadmap_json: Record<string, unknown> | null
          completion_status: 'empty' | 'partial' | 'complete'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          raw_input?: string | null
          salon_name?: string | null
          city?: string | null
          years_experience?: string | null
          team_info?: string | null
          services?: string[] | null
          main_services?: string[] | null
          most_profitable_service?: string | null
          service_to_promote?: string | null
          ideal_client?: string | null
          ideal_client_age?: string | null
          client_problems?: string | null
          client_desires?: string | null
          frequent_questions?: string | null
          frequent_mistakes?: string | null
          main_goal?: string | null
          differentiation?: string | null
          specialty?: string | null
          content_topics?: string[] | null
          optimized_summary?: string | null
          strategy_json?: Record<string, unknown> | null
          roadmap_json?: Record<string, unknown> | null
          completion_status?: 'empty' | 'partial' | 'complete'
          created_at?: string
          updated_at?: string
        }
        Update: {
          salon_name?: string | null
          city?: string | null
          years_experience?: string | null
          team_info?: string | null
          services?: string[] | null
          main_services?: string[] | null
          most_profitable_service?: string | null
          service_to_promote?: string | null
          ideal_client?: string | null
          ideal_client_age?: string | null
          client_problems?: string | null
          client_desires?: string | null
          frequent_questions?: string | null
          frequent_mistakes?: string | null
          main_goal?: string | null
          differentiation?: string | null
          specialty?: string | null
          content_topics?: string[] | null
          optimized_summary?: string | null
          strategy_json?: Record<string, unknown> | null
          roadmap_json?: Record<string, unknown> | null
          completion_status?: 'empty' | 'partial' | 'complete'
          raw_input?: string | null
          updated_at?: string
        }
      }
      content_items: {
        Row: {
          id: string
          user_id: string
          type: 'reel' | 'carrusel' | 'story'
          title: string
          service: string | null
          objective: string | null
          format: string | null
          content_json: Json
          caption_with_hashtags: string | null
          visual_idea: string | null
          scheduled_date: string | null
          status: 'library' | 'scheduled' | 'draft' | 'done'
          tag: string | null
          reto_status: 'idea' | 'grabado' | 'editado' | 'publicado' | null
          done_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'reel' | 'carrusel' | 'story'
          title: string
          service?: string | null
          objective?: string | null
          format?: string | null
          content_json?: Json
          caption_with_hashtags?: string | null
          visual_idea?: string | null
          scheduled_date?: string | null
          status?: 'library' | 'scheduled' | 'draft' | 'done'
          tag?: string | null
          reto_status?: 'idea' | 'grabado' | 'editado' | 'publicado' | null
          done_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: 'reel' | 'carrusel' | 'story'
          title?: string
          service?: string | null
          objective?: string | null
          format?: string | null
          content_json?: Json
          caption_with_hashtags?: string | null
          visual_idea?: string | null
          scheduled_date?: string | null
          status?: 'library' | 'scheduled' | 'draft' | 'done'
          tag?: string | null
          reto_status?: 'idea' | 'grabado' | 'editado' | 'publicado' | null
          done_at?: string | null
          updated_at?: string
        }
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          is_active: boolean
          max_redemptions: number | null
          redemptions_count: number
          access_days: number
          code_type: 'promo' | 'skool'
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          redemptions_count?: number
          access_days?: number
          code_type?: 'promo' | 'skool'
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          code?: string
          description?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          redemptions_count?: number
          access_days?: number
          code_type?: 'promo' | 'skool'
          expires_at?: string | null
        }
      }
      plans: {
        Row: {
          id: number
          name: 'monthly' | 'yearly'
          display_name: string
          interval: 'month' | 'year'
          currency: 'eur' | 'usd'
          current_price: number
          original_price: number | null
          stripe_product_id: string | null
          stripe_price_id: string | null
          is_active: boolean
          is_visible: boolean
          trial_days: number
          badge_text: string | null
          description: string | null
          features: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: 'monthly' | 'yearly'
          display_name: string
          interval?: 'month' | 'year'
          currency: 'eur' | 'usd'
          current_price: number
          original_price?: number | null
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          is_active?: boolean
          is_visible?: boolean
          trial_days?: number
          badge_text?: string | null
          description?: string | null
          features?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          current_price?: number
          original_price?: number | null
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          is_active?: boolean
          is_visible?: boolean
          trial_days?: number
          badge_text?: string | null
          description?: string | null
          features?: string[]
        }
      }
      plan_price_history: {
        Row: {
          id: number
          plan_id: number
          old_price: number | null
          new_price: number | null
          old_stripe_price_id: string | null
          new_stripe_price_id: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          plan_id: number
          old_price?: number | null
          new_price?: number | null
          old_stripe_price_id?: string | null
          new_stripe_price_id?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          old_price?: number | null
          new_price?: number | null
          old_stripe_price_id?: string | null
          new_stripe_price_id?: string | null
          changed_by?: string | null
        }
      }
      reel_inspirations: {
        Row: {
          id: string
          title: string
          short_description: string
          description: string
          idea_text: string | null
          why_text: string | null
          how_text: string | null
          cover_image: string
          instagram_url: string | null
          status: 'active' | 'hidden'
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          short_description: string
          description: string
          idea_text?: string | null
          why_text?: string | null
          how_text?: string | null
          cover_image: string
          instagram_url?: string | null
          status?: 'active' | 'hidden'
          created_at?: string
        }
        Update: {
          title?: string
          short_description?: string
          description?: string
          idea_text?: string | null
          why_text?: string | null
          how_text?: string | null
          cover_image?: string
          instagram_url?: string | null
          status?: 'active' | 'hidden'
        }
      }
      saved_inspirations: {
        Row: {
          user_id: string
          inspiration_id: string
          saved_at: string
        }
        Insert: {
          user_id: string
          inspiration_id: string
          saved_at?: string
        }
        Update: {
          saved_at?: string
        }
      }
      reel_transitions: {
        Row: {
          id: string
          title: string
          short_description: string
          description: string
          idea_text: string | null
          why_text: string | null
          how_text: string | null
          cover_image: string
          instagram_url: string | null
          status: 'active' | 'hidden'
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          short_description: string
          description: string
          idea_text?: string | null
          why_text?: string | null
          how_text?: string | null
          cover_image: string
          instagram_url?: string | null
          status?: 'active' | 'hidden'
          created_at?: string
        }
        Update: {
          title?: string
          short_description?: string
          description?: string
          idea_text?: string | null
          why_text?: string | null
          how_text?: string | null
          cover_image?: string
          instagram_url?: string | null
          status?: 'active' | 'hidden'
        }
      }
      saved_transitions: {
        Row: {
          user_id: string
          transition_id: string
          saved_at: string
        }
        Insert: {
          user_id: string
          transition_id: string
          saved_at?: string
        }
        Update: {
          saved_at?: string
        }
      }
      user_activity_log: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Record<string, unknown>
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Record<string, unknown>
          actor_id?: string | null
          created_at?: string
        }
        Update: {
          event_type?: string
          event_data?: Record<string, unknown>
          actor_id?: string | null
        }
      }
      promo_redemptions: {
        Row: {
          id: string
          user_id: string
          code: string
          redeemed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          redeemed_at?: string
        }
        Update: {
          code?: string
          redeemed_at?: string
        }
      }
      reto_10k_progress: {
        Row: {
          user_id: string
          joined_at: string
          started_at: string | null
          objective: string | null
          services: string[]
          level: string | null
          current_day: number
          current_phase: number
          status: 'not_started' | 'active' | 'paused' | 'completed'
          posts_per_week: number
          completed_at: string | null
          last_generated_week: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          joined_at?: string
          started_at?: string | null
          objective?: string | null
          services?: string[]
          level?: string | null
          current_day?: number
          current_phase?: number
          status?: 'not_started' | 'active' | 'paused' | 'completed'
          posts_per_week?: number
          completed_at?: string | null
          last_generated_week?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          started_at?: string | null
          objective?: string | null
          services?: string[]
          level?: string | null
          current_day?: number
          current_phase?: number
          status?: 'not_started' | 'active' | 'paused' | 'completed'
          posts_per_week?: number
          completed_at?: string | null
          last_generated_week?: number
          updated_at?: string
        }
      }
      reto_10k_config: {
        Row: {
          id: string
          config_json: Record<string, unknown>
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          config_json: Record<string, unknown>
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_json?: Record<string, unknown>
          updated_at?: string
          updated_by?: string | null
        }
      }
      academia_modules: {
        Row: {
          id: string
          title: string
          description: string | null
          sort_order: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          sort_order?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
      }
      academia_lessons: {
        Row: {
          id: string
          module_id: string | null
          title: string
          description: string | null
          loom_url: string
          sort_order: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id?: string | null
          title: string
          description?: string | null
          loom_url: string
          sort_order?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          module_id?: string | null
          title?: string
          description?: string | null
          loom_url?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
      }
      academia_lesson_progress: {
        Row: {
          user_id: string
          lesson_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          lesson_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type BrandProfile = Database['public']['Tables']['brand_profiles']['Row']
export type ContentItem = Database['public']['Tables']['content_items']['Row']
export type PromoCode = Database['public']['Tables']['promo_codes']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type PlanPriceHistory = Database['public']['Tables']['plan_price_history']['Row']
export type ReelInspiration = Database['public']['Tables']['reel_inspirations']['Row']
export type ReelTransition = Database['public']['Tables']['reel_transitions']['Row']
export type SavedInspiration = Database['public']['Tables']['saved_inspirations']['Row']
export type SavedTransition = Database['public']['Tables']['saved_transitions']['Row']
export type UserActivityLog = Database['public']['Tables']['user_activity_log']['Row']
export type PromoRedemption = Database['public']['Tables']['promo_redemptions']['Row']
export type Reto10kProgressRow = Database['public']['Tables']['reto_10k_progress']['Row']
export type Reto10kConfigRow = Database['public']['Tables']['reto_10k_config']['Row']
export type AcademiaModule = Database['public']['Tables']['academia_modules']['Row']
export type AcademiaLesson = Database['public']['Tables']['academia_lessons']['Row']
export type AcademiaLessonProgress = Database['public']['Tables']['academia_lesson_progress']['Row']
