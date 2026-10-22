/**
 * MI PLAN → herramienta (22-oct-2026): prepara el texto de la publicación en
 * la herramienta que toca y devuelve a dónde ir.
 * Reel → Teleprompter con el guion · Carrusel → Carruseles con el tema ·
 * Stories → el diseñador con la secuencia cargada.
 */
import type { ContentItem } from '@/types/database'
import { writeTeleprompterInput } from '@/lib/teleprompter/input'
import { setSessionValue } from '@/lib/session-store'

export function openInTool(item: Pick<ContentItem, 'type' | 'title' | 'content_json'>, userId: string): string {
  const json = (item.content_json || {}) as Record<string, unknown>

  if (item.type === 'reel') {
    const sc = json.script as { hook?: string; context?: string; solution?: string; cta?: string } | undefined
    const script = sc ? [sc.hook, sc.context, sc.solution, sc.cta].filter(Boolean).join('\n\n') : ''
    if (script) writeTeleprompterInput({ script, title: item.title, source: 'reel', returnUrl: '/calendario' })
    return '/teleprompter'
  }

  if (item.type === 'carrusel') {
    const slides = (json.slides as Array<{ text?: string }> | undefined) || []
    const ideas = slides.map(s => s.text).filter(Boolean).slice(0, 3).join(' / ').slice(0, 280)
    // Borrador nuevo de Carruseles con el tema puesto: solo falta elegir estilo.
    setSessionValue(`u:${userId}:carruseles:premium:v1`, {
      styleId: null, view: 'style', topic: ideas ? `${item.title}. Ideas: ${ideas}` : item.title,
      topicChips: [], slideCount: 'auto', proposal: null, ctaOverride: null, signature: { on: false, text: '' },
    })
    return '/carrusel'
  }

  const seq = typeof json.sequenceId === 'string' ? json.sequenceId : null
  return seq ? `/stories?secuencia=${encodeURIComponent(seq)}` : '/stories'
}
