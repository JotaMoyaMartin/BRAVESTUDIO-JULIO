// Selección de guiones grabables desde content_items (la MISMA tabla de Biblioteca —
// Teleprompter es una capa de ejecución, no un sistema nuevo). Puro, sin I/O.
// Patrón: lib/home-today.ts (helpers puros testeables).
import { composeReelSpokenScript, TeleprompterStoryItem } from './input'
import { ContentItem } from '@/types/database'

/** Lo mínimo que un llamador necesita pasar (Biblioteca server, demoGetPlan, mocks). */
export interface SpeakableSourceItem {
  id: string
  type: string | null
  title?: string | null
  content_json?: unknown
  created_at?: string | null
}

/** Tarjeta lista para "Mis guiones" del Teleprompter. */
export interface SavedScriptCard {
  id: string
  title: string
  kind: 'reel' | 'stories' | 'pregunta'
  kindLabel: string
  createdAt: string | null
  preview: string
  text: string // SOLO texto hablado (sin etiquetas GANCHO:/Visual:)
  sequence: TeleprompterStoryItem[] | null // para secuencias de stories
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function preview(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 110 ? `${t.slice(0, 110)}…` : t
}

/**
 * Extrae el texto hablado de un content_item, o null si no es grabable a cámara.
 * - reel: content_json.script (variante anidada o plana) → composeReelSpokenScript
 * - story: content_json.stores[] → cada story es un item de secuencia (text = story 1)
 * - story con question+answer modo camera → la respuesta preparada para decir
 * Nunca: carrusel, placeholder del reto, respuestas escritas, items sin texto.
 */
export function spokenScriptOfItem(item: SpeakableSourceItem): SavedScriptCard | null {
  const json = asRecord(item.content_json)
  if (!json || json.is_plan_placeholder) return null

  if (item.type === 'reel') {
    const s = asRecord(json.script) ?? json // anidado o plano
    const hook = str(s.hook)
    const context = str(s.context)
    const solution = str(s.solution)
    const cta = str(s.cta)
    if (!(hook || context || solution || cta)) return null
    const text = composeReelSpokenScript({ hook, context, solution, cta })
    if (!text.trim()) return null
    return {
      id: item.id,
      title: str(item.title).trim() || 'Reel',
      kind: 'reel',
      kindLabel: 'Reel',
      createdAt: item.created_at ?? null,
      preview: preview(text),
      text,
      sequence: null,
    }
  }

  if (item.type === 'story') {
    if (Array.isArray(json.stories)) {
      const stories = (json.stories as unknown[])
        .map(asRecord)
        .filter((r): r is Record<string, unknown> => !!r)
        .filter(r => str(r.text).trim())
        .map(r => ({
          number: typeof r.number === 'number' ? r.number : 0,
          text: str(r.text).trim(),
        }))
      if (stories.length === 0) return null
      const sequence: TeleprompterStoryItem[] = stories.map((s, i) => ({
        label: `Story ${s.number || i + 1} de ${stories.length}`,
        text: s.text,
      }))
      return {
        id: item.id,
        title: str(item.title).trim() || 'Stories',
        kind: 'stories',
        kindLabel: 'Stories',
        createdAt: item.created_at ?? null,
        preview: preview(sequence[0].text),
        text: sequence[0].text,
        sequence,
      }
    }
    // Respuesta de Caja de preguntas preparada para decir a cámara
    if (str(json.mode) === 'camera' && str(json.answer).trim()) {
      const text = str(json.answer).trim()
      return {
        id: item.id,
        title: str(item.title).trim() || 'Respuesta',
        kind: 'pregunta',
        kindLabel: 'Caja de preguntas',
        createdAt: item.created_at ?? null,
        preview: preview(text),
        text,
        sequence: null,
      }
    }
    return null
  }

  return null
}

/** Filtra y mapea una lista de content_items a tarjetas de guión grabable. */
export function selectSpeakableItems(items: SpeakableSourceItem[]): SavedScriptCard[] {
  return items
    .map(spokenScriptOfItem)
    .filter((c): c is SavedScriptCard => c !== null)
}

/** Input de Teleprompter para abrir desde un item guardado (p.ej. Biblioteca). */
export function teleprompterInputForCard(card: SavedScriptCard, returnUrl: string): {
  script: string
  title: string
  source: 'reel' | 'stories'
  returnUrl: string
  sequence: { current: number; total: number; items: TeleprompterStoryItem[] } | null
} {
  return {
    script: card.text,
    title: card.title,
    source: card.kind === 'reel' ? 'reel' : 'stories',
    returnUrl,
    sequence: card.sequence ? { current: 0, total: card.sequence.length, items: card.sequence } : null,
  }
}

/** Overload cómodo para usar directo desde un ContentItem. */
export function teleprompterInputForItem(item: ContentItem, returnUrl: string) {
  const card = spokenScriptOfItem(item)
  return card ? teleprompterInputForCard(card, returnUrl) : null
}