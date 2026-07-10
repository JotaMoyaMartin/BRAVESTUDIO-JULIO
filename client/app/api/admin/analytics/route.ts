import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) return null
  return createAdminClient()
}

interface ContentRow {
  user_id: string
  type: string
  status: string
  tag: string | null
  reto_status: string | null
  created_at: string
  done_at: string | null
  scheduled_date: string | null
}

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  access_status: string
  subscription_status: string | null
}

interface BrandRow {
  user_id: string
  completion_status: string
  strategy_json: unknown
  updated_at: string
}

interface RetoRow {
  user_id: string
  status: string
  current_day: number
  current_phase: string
  started_at: string | null
}

interface SaveRow {
  user_id: string
  inspiration_id: string | null
  transition_id: string | null
  saved_at: string
}

interface LogRow {
  event_type: string
  created_at: string
  user_id: string | null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const now = new Date()
  const daysAgo30 = new Date(now.getTime() - 30 * 86400000)
  const daysAgo7 = new Date(now.getTime() - 7 * 86400000)
  const daysAgo90 = new Date(now.getTime() - 90 * 86400000)

  const [
    { data: profiles },
    { data: contentItems },
    { data: brandProfiles },
    { data: retoProgress },
    { data: savedInspirations },
    { data: savedTransitions },
    { data: inspirations },
    { data: transitions },
    { data: logs },
  ] = await Promise.all([
    admin.from('profiles').select('id, email, full_name, role, created_at, access_status, subscription_status'),
    admin.from('content_items').select('user_id, type, status, tag, reto_status, created_at, done_at, scheduled_date'),
    admin.from('brand_profiles').select('user_id, completion_status, strategy_json, updated_at'),
    admin.from('reto_10k_progress').select('user_id, status, current_day, current_phase, started_at'),
    admin.from('saved_inspirations').select('user_id, inspiration_id, saved_at'),
    admin.from('saved_transitions').select('user_id, transition_id, saved_at'),
    admin.from('reel_inspirations').select('id, title'),
    admin.from('reel_transitions').select('id, title'),
    admin.from('user_activity_log').select('event_type, created_at, user_id').gte('created_at', daysAgo90.toISOString()).limit(500),
  ])

  const profileList = (profiles as ProfileRow[]) || []
  const contentList = (contentItems as ContentRow[]) || []
  const brandList = (brandProfiles as BrandRow[]) || []
  const retoList = (retoProgress as RetoRow[]) || []
  const savedInsp = (savedInspirations as SaveRow[]) || []
  const savedTrans = (savedTransitions as SaveRow[]) || []
  const inspList = (inspirations as { id: string; title: string }[]) || []
  const transList = (transitions as { id: string; title: string }[]) || []
  const logList = (logs as LogRow[]) || []

  // --- Build per-user aggregation map ---
  interface UserAgg {
    userId: string
    email: string
    fullName: string
    role: string
    contentCount: number
    publishedCount: number
    scheduledCount: number
    lastActivity: string | null
    contentByType: { reel: number; carrusel: number; story: number }
    retoDay: number
    retoStatus: string
    retoActive: boolean
    brandComplete: boolean
    brandStarted: boolean
    hasStrategy: boolean
    savesCount: number
    createdAt: string
  }

  const userMap = new Map<string, UserAgg>()

  for (const p of profileList) {
    userMap.set(p.id, {
      userId: p.id,
      email: p.email,
      fullName: p.full_name || '',
      role: p.role,
      contentCount: 0,
      publishedCount: 0,
      scheduledCount: 0,
      lastActivity: null,
      contentByType: { reel: 0, carrusel: 0, story: 0 },
      retoDay: 0,
      retoStatus: 'not_started',
      retoActive: false,
      brandComplete: false,
      brandStarted: false,
      hasStrategy: false,
      savesCount: 0,
      createdAt: p.created_at,
    })
  }

  // Content items
  for (const c of contentList) {
    const u = userMap.get(c.user_id)
    if (!u) continue
    u.contentCount++
    if (c.type === 'reel') u.contentByType.reel++
    else if (c.type === 'carrusel') u.contentByType.carrusel++
    else if (c.type === 'story') u.contentByType.story++
    if (c.status === 'done') u.publishedCount++
    if (c.status === 'scheduled') u.scheduledCount++
    if (!u.lastActivity || c.created_at > u.lastActivity) u.lastActivity = c.created_at
  }

  // Brand profiles
  for (const b of brandList) {
    const u = userMap.get(b.user_id)
    if (!u) continue
    u.brandComplete = b.completion_status === 'complete'
    u.brandStarted = b.completion_status !== 'empty'
    u.hasStrategy = b.strategy_json != null && typeof b.strategy_json === 'object' && Object.keys(b.strategy_json as object).length > 0
  }

  // Reto progress
  for (const r of retoList) {
    const u = userMap.get(r.user_id)
    if (!u) continue
    u.retoDay = r.current_day || 0
    u.retoStatus = r.status
    u.retoActive = r.status === 'active' || r.status === 'completed'
  }

  // Saves
  for (const s of savedInsp) {
    const u = userMap.get(s.user_id)
    if (!u) continue
    u.savesCount++
  }
  for (const s of savedTrans) {
    const u = userMap.get(s.user_id)
    if (!u) continue
    u.savesCount++
  }

  // --- Activity score ---
  const ranking = Array.from(userMap.values()).map(u => ({
    userId: u.userId,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    contentCount: u.contentCount,
    publishedCount: u.publishedCount,
    scheduledCount: u.scheduledCount,
    lastActivity: u.lastActivity,
    retoDay: u.retoDay,
    retoStatus: u.retoStatus,
    brandComplete: u.brandComplete,
    savesCount: u.savesCount,
    contentByType: u.contentByType,
    activityScore:
      u.contentCount * 3 +
      u.publishedCount * 5 +
      (u.retoActive ? 10 : 0) +
      (u.brandComplete ? 15 : 0) +
      u.savesCount * 2 +
      u.scheduledCount * 3,
  }))
  ranking.sort((a, b) => b.activityScore - a.activityScore)

  // --- Global KPIs ---
  const totalContent = contentList.length
  const totalUsers = profileList.length
  const activeUsers7d = new Set<string>()
  const activeUsers30d = new Set<string>()
  for (const c of contentList) {
    const d = new Date(c.created_at)
    if (d >= daysAgo7) activeUsers7d.add(c.user_id)
    if (d >= daysAgo30) activeUsers30d.add(c.user_id)
  }
  // Also count saves as activity
  for (const s of [...savedInsp, ...savedTrans]) {
    const d = new Date(s.saved_at)
    if (d >= daysAgo7) activeUsers7d.add(s.user_id)
    if (d >= daysAgo30) activeUsers30d.add(s.user_id)
  }
  const brandCompleteCount = brandList.filter(b => b.completion_status === 'complete').length
  const retoParticipants = retoList.filter(r => r.status === 'active' || r.status === 'completed' || r.status === 'paused').length
  const totalPublished = contentList.filter(c => c.status === 'done').length
  const totalSaves = savedInsp.length + savedTrans.length

  // --- Type breakdown ---
  const typeBreakdown = { reel: 0, carrusel: 0, story: 0 }
  for (const c of contentList) {
    if (c.type === 'reel') typeBreakdown.reel++
    else if (c.type === 'carrusel') typeBreakdown.carrusel++
    else if (c.type === 'story') typeBreakdown.story++
  }

  // --- Status breakdown ---
  const statusBreakdown = { library: 0, scheduled: 0, done: 0, draft: 0 }
  for (const c of contentList) {
    if (c.status === 'library') statusBreakdown.library++
    else if (c.status === 'scheduled') statusBreakdown.scheduled++
    else if (c.status === 'done') statusBreakdown.done++
    else if (c.status === 'draft') statusBreakdown.draft++
  }

  // --- Content trends (last 30 days) ---
  const trendMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    trendMap.set(d.toISOString().split('T')[0], 0)
  }
  for (const c of contentList) {
    const dateStr = new Date(c.created_at).toISOString().split('T')[0]
    if (trendMap.has(dateStr)) trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1)
  }
  const contentTrends = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }))

  // --- Section usage ---
  const sections: { section: string; label: string; users: Set<string>; totalActions: number }[] = [
    { section: 'crear-contenido', label: 'Crear Contenido', users: new Set(), totalActions: 0 },
    { section: 'stories', label: 'Stories BRÄVE', users: new Set(), totalActions: 0 },
    { section: 'mi-marca', label: 'Mi Marca', users: new Set(), totalActions: 0 },
    { section: 'reto-10k', label: 'Reto 10K', users: new Set(), totalActions: 0 },
    { section: 'inspiracion-reels', label: 'Inspiración Reels', users: new Set(), totalActions: 0 },
    { section: 'transiciones-reels', label: 'Transiciones Reels', users: new Set(), totalActions: 0 },
    { section: 'calendario', label: 'Calendario', users: new Set(), totalActions: 0 },
    { section: 'biblioteca', label: 'Biblioteca', users: new Set(), totalActions: 0 },
    { section: 'mi-estrategia', label: 'Mi Estrategia', users: new Set(), totalActions: 0 },
    { section: 'plan-contenidos', label: 'Plan Contenidos', users: new Set(), totalActions: 0 },
  ]
  const secMap = new Map(sections.map(s => [s.section, s]))

  for (const c of contentList) {
    // Crear contenido (excluye reto-10k y premium-script)
    if (c.tag !== 'reto-10k' && c.tag !== 'premium-script') {
      const s = secMap.get('crear-contenido')!
      s.users.add(c.user_id)
      s.totalActions++
    }
    // Stories
    if (c.type === 'story') {
      const s = secMap.get('stories')!
      s.users.add(c.user_id)
      s.totalActions++
    }
    // Reto 10K
    if (c.tag === 'reto-10k') {
      const s = secMap.get('reto-10k')!
      s.users.add(c.user_id)
      s.totalActions++
    }
    // Calendario
    if (c.status === 'scheduled') {
      const s = secMap.get('calendario')!
      s.users.add(c.user_id)
      s.totalActions++
    }
    // Biblioteca
    if (c.status === 'library' || c.status === 'done') {
      const s = secMap.get('biblioteca')!
      s.users.add(c.user_id)
      s.totalActions++
    }
    // Plan contenidos premium
    if (c.tag === 'premium-script') {
      const s = secMap.get('plan-contenidos')!
      s.users.add(c.user_id)
      s.totalActions++
    }
  }
  // Mi Marca
  for (const b of brandList) {
    if (b.completion_status !== 'empty') {
      const s = secMap.get('mi-marca')!
      s.users.add(b.user_id)
      s.totalActions++
    }
  }
  // Mi Estrategia (premium con strategy)
  for (const b of brandList) {
    if (b.strategy_json != null && typeof b.strategy_json === 'object' && Object.keys(b.strategy_json as object).length > 0) {
      const s = secMap.get('mi-estrategia')!
      s.users.add(b.user_id)
      s.totalActions++
    }
  }
  // Reto 10K participants
  for (const r of retoList) {
    if (r.status !== 'not_started') {
      const s = secMap.get('reto-10k')!
      s.users.add(r.user_id)
      s.totalActions++
    }
  }
  // Saved inspirations
  for (const sv of savedInsp) {
    const s = secMap.get('inspiracion-reels')!
    s.users.add(sv.user_id)
    s.totalActions++
  }
  // Saved transitions
  for (const sv of savedTrans) {
    const s = secMap.get('transiciones-reels')!
    s.users.add(sv.user_id)
    s.totalActions++
  }

  const maxSectionActions = Math.max(...sections.map(s => s.totalActions), 1)
  const sectionUsage = sections
    .map(s => ({
      section: s.section,
      label: s.label,
      users: s.users.size,
      totalActions: s.totalActions,
      percentage: Math.round((s.totalActions / maxSectionActions) * 100),
    }))
    .sort((a, b) => b.totalActions - a.totalActions)

  // --- Reto stats ---
  const retoStats = {
    participants: retoList.filter(r => r.status !== 'not_started').length,
    active: retoList.filter(r => r.status === 'active').length,
    completed: retoList.filter(r => r.status === 'completed').length,
    paused: retoList.filter(r => r.status === 'paused').length,
    avgDay: retoList.length > 0 ? Math.round(retoList.reduce((sum, r) => sum + (r.current_day || 0), 0) / retoList.length) : 0,
    totalContent: contentList.filter(c => c.tag === 'reto-10k').length,
    byPhase: retoList.reduce((acc, r) => {
      const phase = r.current_phase || 'N/A'
      acc[phase] = (acc[phase] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  // --- Event counts (last 30 days) ---
  const eventMap = new Map<string, number>()
  for (const l of logList) {
    if (new Date(l.created_at) >= daysAgo30) {
      eventMap.set(l.event_type, (eventMap.get(l.event_type) || 0) + 1)
    }
  }
  const eventCounts = Array.from(eventMap.entries())
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count)

  // --- Top saved inspirations/transitions ---
  const inspSaveCounts = new Map<string, number>()
  for (const sv of savedInsp) {
    if (sv.inspiration_id) inspSaveCounts.set(sv.inspiration_id, (inspSaveCounts.get(sv.inspiration_id) || 0) + 1)
  }
  const inspTitleMap = new Map(inspList.map(i => [i.id, i.title]))
  const topInspirations = Array.from(inspSaveCounts.entries())
    .map(([id, saves]) => ({ id, title: inspTitleMap.get(id) || '—', saves }))
    .sort((a, b) => b.saves - a.saves)
    .slice(0, 5)

  const transSaveCounts = new Map<string, number>()
  for (const sv of savedTrans) {
    if (sv.transition_id) transSaveCounts.set(sv.transition_id, (transSaveCounts.get(sv.transition_id) || 0) + 1)
  }
  const transTitleMap = new Map(transList.map(t => [t.id, t.title]))
  const topTransitions = Array.from(transSaveCounts.entries())
    .map(([id, saves]) => ({ id, title: transTitleMap.get(id) || '—', saves }))
    .sort((a, b) => b.saves - a.saves)
    .slice(0, 5)

  // --- Auto insights ---
  const insights: string[] = []
  if (totalContent > 0) {
    const reelPct = Math.round((typeBreakdown.reel / totalContent) * 100)
    insights.push(`El ${reelPct}% del contenido creado son reels, ${Math.round((typeBreakdown.carrusel / totalContent) * 100)}% carruseles y ${Math.round((typeBreakdown.story / totalContent) * 100)}% stories.`)
  }
  if (totalUsers > 0) {
    const brandPct = Math.round((brandCompleteCount / totalUsers) * 100)
    insights.push(`${brandCompleteCount} usuarias (${brandPct}%) han completado Mi Marca.`)
    const retoPct = Math.round((retoStats.participants / totalUsers) * 100)
    insights.push(`${retoStats.participants} usuarias (${retoPct}%) participan en el Reto 10K.`)
  }
  if (activeUsers7d.size > 0) {
    insights.push(`${activeUsers7d.size} usuarias han creado contenido o guardado ideas en los últimos 7 días.`)
  }
  if (ranking.length > 0 && ranking[0].activityScore > 0) {
    insights.push(`La usuaria más activa es ${ranking[0].fullName || ranking[0].email} con ${ranking[0].contentCount} contenidos y un score de ${ranking[0].activityScore}.`)
  }
  if (totalPublished > 0) {
    const pubRate = Math.round((totalPublished / totalContent) * 100)
    insights.push(`${totalPublished} contenidos publicados (${pubRate}% del total).`)
  }
  if (totalSaves > 0) {
    insights.push(`${totalSaves} inspiraciones/transiciones guardadas en total — las usuarias guardan contenido para reusar.`)
  }
  const inactiveUsers = profileList.filter(p => p.role === 'user' && !contentList.some(c => c.user_id === p.id)).length
  if (inactiveUsers > 0) {
    insights.push(`${inactiveUsers} usuarias nunca han creado contenido — oportunidad para reactivarlas.`)
  }

  return NextResponse.json({
    global: {
      totalContent,
      totalUsers,
      activeUsers7d: activeUsers7d.size,
      activeUsers30d: activeUsers30d.size,
      avgContentPerUser: totalUsers > 0 ? Math.round((totalContent / totalUsers) * 10) / 10 : 0,
      brandCompletionRate: totalUsers > 0 ? Math.round((brandCompleteCount / totalUsers) * 100) : 0,
      retoParticipationRate: totalUsers > 0 ? Math.round((retoStats.participants / totalUsers) * 100) : 0,
      totalSaves,
      totalPublished,
    },
    userRanking: ranking,
    sectionUsage,
    contentTrends,
    typeBreakdown,
    statusBreakdown,
    retoStats,
    eventCounts,
    topInspirations,
    topTransitions,
    insights,
  })
}