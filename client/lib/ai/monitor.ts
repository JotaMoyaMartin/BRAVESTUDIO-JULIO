/**
 * VIGILANCIA DE LA IA · servidor (23-oct-2026).
 * - Cada fallo de callLLM se guarda en la tabla ai_status_log.
 * - Si hay ALERT_THRESHOLD fallos en ALERT_WINDOW_MIN minutos, manda un
 *   email al admin (como mucho uno cada ALERT_COOLDOWN_MIN minutos).
 * - La prueba automática (cron diario y botón «Probar ahora») guarda OK/fallo.
 * Nada de esto puede romper la petición de la clienta: todo va en try/catch.
 */
import {
  ALERT_COOLDOWN_MIN, ALERT_THRESHOLD, ALERT_WINDOW_MIN, REASON_TEXT, classifyAIError, summarizeAIStatus,
  type AIEventRow, type AIReason, type AIStatus,
} from './monitor-core'

const ALERT_TO = () => process.env.AI_ALERT_EMAIL || process.env.ADMIN_EMAIL || ''

function canLog(): boolean {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http') && !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

async function admin() {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  return createAdminClient()
}

export async function recordAIFailure(err: unknown, ctx: { section?: string | null; model?: string; userId?: string | null } = {}) {
  if (!canLog()) return
  const { reason, detail } = classifyAIError(err)
  try {
    const db = await admin()
    await db.from('ai_status_log').insert({ ok: false, section: ctx.section ?? 'servidor', reason, detail, model: ctx.model ?? null, user_id: ctx.userId ?? null } as never)
    await maybeAlert(db, reason, detail, ctx.section ?? 'servidor')
  } catch (e) {
    console.error('[ai-monitor] no se pudo guardar el fallo', e)
  }
}

export async function recordAIOk(section: string, model?: string) {
  if (!canLog()) return
  try {
    const db = await admin()
    await db.from('ai_status_log').insert({ ok: true, section, model: model ?? null } as never)
  } catch (e) {
    console.error('[ai-monitor] no se pudo guardar la prueba', e)
  }
}

type DB = Awaited<ReturnType<typeof admin>>

async function maybeAlert(db: DB, reason: AIReason, detail: string, section: string) {
  const to = ALERT_TO()
  if (!to) return
  const since = new Date(Date.now() - ALERT_WINDOW_MIN * 60_000).toISOString()
  const { count } = await db.from('ai_status_log').select('id', { count: 'exact', head: true }).eq('ok', false).gte('created_at', since)
  // La prueba automática que falla avisa sola; las clientas, a partir del umbral.
  if (section !== 'prueba-automatica' && (count ?? 0) < ALERT_THRESHOLD) return
  const cooldown = new Date(Date.now() - ALERT_COOLDOWN_MIN * 60_000).toISOString()
  const { data: recent } = await db.from('ai_status_log').select('id').eq('section', 'aviso-enviado').gte('created_at', cooldown).limit(1)
  if (recent?.length) return
  await db.from('ai_status_log').insert({ ok: false, section: 'aviso-enviado', reason, detail: `Aviso enviado a ${to}` } as never)
  const r = REASON_TEXT[reason]
  const { sendEmail } = await import('@/lib/email/send')
  await sendEmail(
    to,
    `⚠️ BRÄVE Studio: la IA está fallando (${r.titulo})`,
    `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2B1A1F">
      <h2 style="color:#591427;margin:0 0 8px">La IA de BRÄVE Studio está fallando</h2>
      <p><strong>Qué pasa:</strong> ${r.titulo}.</p>
      <p><strong>Qué hacer:</strong> ${r.que_hacer}</p>
      <p><strong>Dónde:</strong> ${section} · ${count ?? 1} fallos en los últimos ${ALERT_WINDOW_MIN} minutos.</p>
      <p style="color:#6B5A5F;font-size:13px">Detalle técnico: ${detail.replace(/</g, '&lt;')}</p>
      <p><a href="https://bravestudio.app/admin" style="color:#B8324F;font-weight:bold">Ver el estado en el panel de admin →</a></p>
      <p style="color:#6B5A5F;font-size:13px">Mientras tanto, las clientas ven el aviso «La IA no está disponible ahora mismo». No te llegará otro aviso hasta dentro de ${ALERT_COOLDOWN_MIN} minutos.</p>
    </div>`,
  )
}

export async function getAIStatus(): Promise<AIStatus | null> {
  if (!canLog()) return null
  const db = await admin()
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()
  const { data, error } = await db.from('ai_status_log').select('created_at, ok, section, reason, detail')
    .neq('section', 'aviso-enviado').gte('created_at', since).order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return summarizeAIStatus((data ?? []) as AIEventRow[])
}

/** Prueba real: una pregunta mínima a la IA. Guarda el resultado. */
export async function runAIProbe(): Promise<{ ok: boolean; ms: number; reason?: AIReason }> {
  const { callLLM } = await import('./llm')
  const t0 = Date.now()
  try {
    const { model } = await callLLM({ prompt: 'Responde solo con la palabra OK.', timeoutMs: 45_000, retries: 1, section: 'prueba-automatica' })
    await recordAIOk('prueba-automatica', model)
    return { ok: true, ms: Date.now() - t0 }
  } catch (err) {
    // callLLM ya ha guardado el fallo (y avisado si toca).
    return { ok: false, ms: Date.now() - t0, reason: classifyAIError(err).reason }
  }
}
