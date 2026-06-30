import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dekcpstpjqqqagjaqxot.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla2Nwc3RwanFxcWFnamFxeG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzY3NjQsImV4cCI6MjA5Njg1Mjc2NH0.UyPng-CNN08w73mVsJJlERdhc5BdsFifAWFT9bhxPwA'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
