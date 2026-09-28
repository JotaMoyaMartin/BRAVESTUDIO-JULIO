import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import InicioClient from './InicioClient'
import { Profile, BrandProfile, ContentItem } from '@/types/database'
import { Reto10kProgress, Reto10kConfig } from '@/types/reto10k'
import { computeCurrentDay } from '@/lib/reto-plan'
import { TodayInput, localISODate, getWeekKey, pickLastPendingItem, pickRetoTodayStatus } from '@/lib/home-today'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

const DEMO_PROFILE: Profile = {
  id: 'demo', email: 'demo@bravestudio.com', full_name: 'Demo Estilista',
  salon_name: 'Mi Salón', is_active: true, role: 'user',
  access_status: 'active', access_source: 'manual',
  stripe_customer_id: null, stripe_subscription_id: null,
  subscription_status: 'none', subscription_plan: null, promo_code_used: null,
  access_expires_at: null, city: null, professional_role: null,
  last_visited_section: null, level: 1, xp_total: 0,
  activated_by: null, activated_at: null, signup_method: 'signup',
  trial_started_at: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

export default async function InicioPage() {
  if (!IS_CONFIGURED) {
    return <InicioClient profile={DEMO_PROFILE} todayInput={null} isPremium={false} />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Check premium preview mode (admin visualizing premium experience)
  const cookieStore = await cookies()
  const previewPremium = cookieStore.get('brave_preview_premium')?.value === 'true'
  const realRole = (profile as { role?: string } | null)?.role
  const isPremium = realRole === 'premium' || (previewPremium && (realRole === 'admin' || realRole === 'superadmin'))

  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('completion_status, salon_name, main_priority, main_services, service_to_promote')
    .eq('user_id', user!.id)
    .maybeSingle()
  const { data: items } = await supabase
    .from('content_items')
    .select('id, type, title, status, reto_status, scheduled_date, done_at, created_at, updated_at, tag')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  // Cargar progreso del Reto 10K solo para usuarios normales
  let retoProgressRow: Reto10kProgress | null = null
  if (!isPremium) {
    const { data: retoRow } = await supabase
      .from('reto_10k_progress')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle()
    retoProgressRow = retoRow
  }

  // Home "Hoy" — proyección determinista de estados existentes (ARCH §5.5).
  const todayISO = localISODate(new Date())
  const weekKey = getWeekKey(new Date())
  const itemList = (items as Partial<ContentItem>[] | null) || []
  const retoActive = !isPremium && retoProgressRow?.status === 'active'
  const retoDay = retoActive ? computeCurrentDay(retoProgressRow!.started_at) : 0
  let retoMissionTitle: string | null = null
  if (retoActive) {
    const { data: cfg } = await supabase
      .from('reto_10k_config')
      .select('config_json')
      .eq('id', 'default')
      .maybeSingle()
    const config = (cfg?.config_json as unknown as Reto10kConfig | null) ?? null
    retoMissionTitle = config?.missions?.find(m => m.day === retoDay)?.title ?? null
  }
  const inWeek = (iso: string | null | undefined) => !!iso && getWeekKey(new Date(iso)) === weekKey
  const brandRow = (brand as Partial<BrandProfile> | null) ?? null
  const todayInput: TodayInput = {
    brandState: brandRow?.completion_status ?? null,
    isPremium,
    retoActive,
    retoDay,
    retoMissionTitle,
    retoTodayItemStatus: retoActive ? pickRetoTodayStatus(itemList, retoDay) : null,
    scheduledToday: itemList
      .filter(i => i.scheduled_date === todayISO && i.status === 'scheduled')
      .map(i => ({ id: String(i.id), title: i.title ?? null, type: i.type ?? null })),
    lastPendingItem: pickLastPendingItem(itemList, (profile as Profile | null)?.last_visited_section ?? null),
    mainPriority: brandRow?.main_priority ?? null,
    starService: brandRow?.service_to_promote ?? (brandRow?.main_services?.[0] ?? null),
    todayISO,
    weekCreated: itemList.filter(i => inWeek(i.created_at)).length,
    weekPublished: itemList.filter(i => (i.reto_status === 'publicado' || i.status === 'done') && inWeek(i.done_at || i.updated_at)).length,
    weeklyTarget: retoActive ? (retoProgressRow?.posts_per_week ?? null) : null,
  }

  return (
    <InicioClient
      profile={profile as Profile | null}
      todayInput={todayInput}
      isPremium={isPremium}
    />
  )
}