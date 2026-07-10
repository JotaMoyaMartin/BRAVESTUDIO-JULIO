import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) return null
  return createAdminClient()
}

interface ContentRow {
  id: string
  type: string
  status: string
  tag: string | null
  title: string
  service: string | null
  reto_status: string | null
  created_at: string
  done_at: string | null
  scheduled_date: string | null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const userId = params.id

  const [
    { data: profile },
    { data: contentItems },
    { data: brandProfile },
    { data: retoProgress },
    { data: savedInspirations },
    { data: savedTransitions },
    { data: inspirations },
    { data: transitions },
    { data: activityLogs },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).single(),
    admin.from('content_items').select('id, type, status, tag, title, service, reto_status, created_at, done_at, scheduled_date').eq('user_id', userId).order('created_at', { ascending: false }),
    admin.from('brand_profiles').select('completion_status, strategy_json, created_at, updated_at, salon_name, city').eq('user_id', userId).single(),
    admin.from('reto_10k_progress').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('saved_inspirations').select('inspiration_id, saved_at').eq('user_id', userId).order('saved_at', { ascending: false }),
    admin.from('saved_transitions').select('transition_id, saved_at').eq('user_id', userId).order('saved_at', { ascending: false }),
    admin.from('reel_inspirations').select('id, title'),
    admin.from('reel_transitions').select('id, title'),
    admin.from('user_activity_log').select('event_type, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
  ])

  const items = (contentItems as ContentRow[]) || []
  const savedInsp = (savedInspirations as { inspiration_id: string; saved_at: string }[]) || []
  const savedTrans = (savedTransitions as { transition_id: string; saved_at: string }[]) || []
  const inspMap = new Map((inspirations as { id: string; title: string }[] || []).map(i => [i.id, i.title]))
  const transMap = new Map((transitions as { id: string; title: string }[] || []).map(t => [t.id, t.title]))
  const logs = (activityLogs as { event_type: string; created_at: string }[]) || []

  // --- Daily activity map (last 90 days) ---
  const now = new Date()
  const dayMap = new Map<string, { content: number; saves: number; events: number }>()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    dayMap.set(d.toISOString().split('T')[0], { content: 0, saves: 0, events: 0 })
  }
  for (const c of items) {
    const dateStr = new Date(c.created_at).toISOString().split('T')[0]
    if (dayMap.has(dateStr)) dayMap.get(dateStr)!.content++
  }
  for (const s of [...savedInsp, ...savedTrans]) {
    const dateStr = new Date(s.saved_at).toISOString().split('T')[0]
    if (dayMap.has(dateStr)) dayMap.get(dateStr)!.saves++
  }
  for (const l of logs) {
    const dateStr = new Date(l.created_at).toISOString().split('T')[0]
    if (dayMap.has(dateStr)) dayMap.get(dateStr)!.events++
  }

  const dailyActivity = Array.from(dayMap.entries()).map(([date, counts]) => ({
    date,
    total: counts.content + counts.saves + counts.events,
    ...counts,
  }))

  // --- Calendar grid (last 30 days for visual) ---
  const calendar30 = dailyActivity.slice(-30)

  // --- Active days (days with any activity) ---
  const activeDays = dailyActivity.filter(d => d.total > 0).length

  // --- Current streak (consecutive days with activity ending today or yesterday) ---
  let streak = 0
  for (let i = dailyActivity.length - 1; i >= 0; i--) {
    if (dailyActivity[i].total > 0) {
      streak++
    } else {
      // Allow today to be empty (user hasn't done anything yet today)
      if (i === dailyActivity.length - 1) continue
      break
    }
  }

  // --- Type breakdown ---
  const typeBreakdown = { reel: 0, carrusel: 0, story: 0 }
  for (const c of items) {
    if (c.type === 'reel') typeBreakdown.reel++
    else if (c.type === 'carrusel') typeBreakdown.carrusel++
    else if (c.type === 'story') typeBreakdown.story++
  }

  // --- Status breakdown ---
  const statusBreakdown = { library: 0, scheduled: 0, done: 0, draft: 0 }
  for (const c of items) {
    if (c.status === 'library') statusBreakdown.library++
    else if (c.status === 'scheduled') statusBreakdown.scheduled++
    else if (c.status === 'done') statusBreakdown.done++
    else if (c.status === 'draft') statusBreakdown.draft++
  }

  // --- Section usage for this user ---
  const sections: { section: string; label: string; count: number }[] = []
  // Crear Contenido (excluye reto-10k y premium-script)
  sections.push({
    section: 'crear-contenido',
    label: 'Crear Contenido',
    count: items.filter(c => c.tag !== 'reto-10k' && c.tag !== 'premium-script').length,
  })
  // Stories
  sections.push({ section: 'stories', label: 'Stories', count: items.filter(c => c.type === 'story').length })
  // Reto 10K
  sections.push({ section: 'reto-10k', label: 'Reto 10K', count: items.filter(c => c.tag === 'reto-10k').length })
  // Calendario
  sections.push({ section: 'calendario', label: 'Calendario', count: items.filter(c => c.status === 'scheduled').length })
  // Biblioteca
  sections.push({ section: 'biblioteca', label: 'Biblioteca', count: items.filter(c => c.status === 'library' || c.status === 'done').length })
  // Inspiración Reels
  sections.push({ section: 'inspiracion-reels', label: 'Inspiración Reels', count: savedInsp.length })
  // Transiciones Reels
  sections.push({ section: 'transiciones-reels', label: 'Transiciones Reels', count: savedTrans.length })
  // Plan Contenidos (premium)
  sections.push({ section: 'plan-contenidos', label: 'Plan Contenidos', count: items.filter(c => c.tag === 'premium-script').length })

  // --- Recent items (last 15) ---
  const recentItems = items.slice(0, 15).map(c => ({
    id: c.id,
    type: c.type,
    status: c.status,
    tag: c.tag,
    title: c.title,
    service: c.service,
    retoStatus: c.reto_status,
    createdAt: c.created_at,
    doneAt: c.done_at,
  }))

  // --- Recent saves ---
  const recentSaves = [
    ...savedInsp.map(s => ({ type: 'inspiracion' as const, title: inspMap.get(s.inspiration_id) || '—', date: s.saved_at })),
    ...savedTrans.map(s => ({ type: 'transicion' as const, title: transMap.get(s.transition_id) || '—', date: s.saved_at })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  // --- Reto detail ---
  const reto = retoProgress as { status: string; current_day: number; current_phase: string; started_at: string; completed_at: string; posts_per_week: number; objective: string } | null

  // --- Brand detail ---
  const brand = brandProfile as { completion_status: string; strategy_json: unknown; created_at: string; updated_at: string; salon_name: string; city: string } | null

  // --- First activity date ---
  const allDates = [
    ...items.map(c => c.created_at),
    ...savedInsp.map(s => s.saved_at),
    ...savedTrans.map(s => s.saved_at),
    ...(profile as { created_at: string })?.created_at ? [(profile as { created_at: string }).created_at] : [],
  ].filter(Boolean).sort()
  const firstActivity = allDates[0] || null
  const lastActivity = allDates[allDates.length - 1] || null

  return NextResponse.json({
    profile: profile as Record<string, unknown> | null,
    summary: {
      totalContent: items.length,
      totalPublished: items.filter(c => c.status === 'done').length,
      totalScheduled: items.filter(c => c.status === 'scheduled').length,
      totalSaves: savedInsp.length + savedTrans.length,
      activeDays,
      streak,
      firstActivity,
      lastActivity,
      lastVisitedSection: (profile as { last_visited_section: string | null })?.last_visited_section || null,
    },
    dailyActivity,
    calendar30,
    typeBreakdown,
    statusBreakdown,
    sectionUsage: sections.sort((a, b) => b.count - a.count),
    recentItems,
    recentSaves,
    reto: reto ? {
      status: reto.status,
      currentDay: reto.current_day,
      currentPhase: reto.current_phase,
      startedAt: reto.started_at,
      completedAt: reto.completed_at,
      postsPerWeek: reto.posts_per_week,
      objective: reto.objective,
      retoContentCount: items.filter(c => c.tag === 'reto-10k').length,
      retoPublished: items.filter(c => c.tag === 'reto-10k' && c.status === 'done').length,
    } : null,
    brand: brand ? {
      completionStatus: brand.completion_status,
      hasStrategy: brand.strategy_json != null && typeof brand.strategy_json === 'object' && Object.keys(brand.strategy_json as object).length > 0,
      createdAt: brand.created_at,
      updatedAt: brand.updated_at,
      salonName: brand.salon_name,
      city: brand.city,
    } : null,
    recentEvents: logs.slice(0, 15).map(l => ({
      eventType: l.event_type,
      date: l.created_at,
    })),
  })
}