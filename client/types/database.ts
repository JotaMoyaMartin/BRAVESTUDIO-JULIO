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
          role: 'user' | 'admin'
          access_status: 'active' | 'inactive'
          access_source: 'manual' | 'stripe' | 'skool' | 'promo' | 'none'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | null
          subscription_plan: 'monthly' | 'yearly' | null
          promo_code_used: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          salon_name?: string | null
          is_active?: boolean
          role?: 'user' | 'admin'
          access_status?: 'active' | 'inactive'
          access_source?: 'manual' | 'stripe' | 'skool' | 'promo' | 'none'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | null
          subscription_plan?: 'monthly' | 'yearly' | null
          promo_code_used?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          salon_name?: string | null
          is_active?: boolean
          role?: 'user' | 'admin'
          access_status?: 'active' | 'inactive'
          access_source?: 'manual' | 'stripe' | 'skool' | 'promo' | 'none'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | null
          subscription_plan?: 'monthly' | 'yearly' | null
          promo_code_used?: string | null
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
          status: 'library' | 'scheduled' | 'draft'
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
          status?: 'library' | 'scheduled' | 'draft'
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
          status?: 'library' | 'scheduled' | 'draft'
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
          expires_at?: string | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type BrandProfile = Database['public']['Tables']['brand_profiles']['Row']
export type ContentItem = Database['public']['Tables']['content_items']['Row']
export type PromoCode = Database['public']['Tables']['promo_codes']['Row']
