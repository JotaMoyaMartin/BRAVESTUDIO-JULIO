import { createClient } from '@/lib/supabase/client'
import { demoSavePlan, demoUpdatePlan, demoDeletePlan } from '@/lib/demo-store'
import { ContentItem } from '@/types/database'

// ── Clipboard ──────────────────────────────────────────────────────

export function copyToClipboard(text: string): void {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}

// ── Format content for copy ────────────────────────────────────────

export function formatContentForCopy(
  item: ContentItem,
  mode: 'full' | 'visual' = 'full'
): string {
  const json = (item.content_json || {}) as Record<string, unknown>
  const cap = item.caption_with_hashtags || ''
  const visual = mode === 'visual'

  // Reel
  if (item.type === 'reel' && json.script) {
    const s = json.script as Record<string, string>
    if (visual) {
      return `🎬 ${item.title}\n\n✨ GANCHO:\n${s.hook}\n\n👁️ CONTEXTO:\n${s.context}\n\n💡 SOLUCIÓN:\n${s.solution}\n\n💌 CTA:\n${s.cta}${cap ? `\n\n📝 PUBLICACIÓN:\n${cap}` : ''}`
    }
    return `GANCHO:\n${s.hook}\n\nCONTEXTO:\n${s.context}\n\nSOLUCIÓN:\n${s.solution}\n\nCTA:\n${s.cta}${cap ? `\n\nPUBLICACIÓN:\n${cap}` : ''}`
  }

  // Carrusel
  if (item.type === 'carrusel' && json.slides) {
    const slides = json.slides as Array<{ number: number; role: string; text: string }>
    const body = visual
      ? slides.map(s => `Slide ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
      : slides.map(s => `Slide ${s.number} — ${s.role}:\n${s.text}`).join('\n\n')
    return body + (cap ? `\n\nPUBLICACIÓN:\n${cap}` : '')
  }

  // Story
  if (item.type === 'story') {
    // Stories guardadas como secuencia
    if (json.stories) {
      const stories = json.stories as Array<{ number: number; role: string; text: string }>
      if (visual) {
        return stories.map(s => `📱 Story ${s.number} — ${s.role}\n\n${s.text}`).join('\n\n✨\n\n')
      }
      return stories.map(s => `Story ${s.number} — ${s.role}:\n${s.text}`).join('\n\n---\n\n')
    }
    // Pregunta guardada
    if (json.question) {
      const q = json.question as string
      const a = (json.answer as string) || ''
      if (visual) {
        return `🤔 Pregunta:\n${q}${a ? `\n\n💭 Respuesta:\n${a}` : ''}`
      }
      return `Pregunta: ${q}${a ? `\n\nRespuesta: ${a}` : ''}`
    }
  }

  // Fallback
  return cap || item.title || 'Contenido guardado'
}

export function formatMultipleForCopy(items: ContentItem[]): string {
  return items
    .map((item, i) => `${i + 1}. ${item.title}\n${formatContentForCopy(item)}`)
    .join('\n\n━━━━━━━━━━━━━━━━\n\n')
}

// ── Persistence helpers ────────────────────────────────────────────

export async function saveToLibrary(
  userId: string,
  payload: Record<string, unknown>,
  isDemoMode: boolean
): Promise<void> {
  if (isDemoMode) {
    demoSavePlan({ ...payload, status: 'library' })
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').insert({ user_id: userId, ...payload, status: 'library' })
}

export async function scheduleItem(
  userId: string,
  itemId: string,
  date: string,
  isDemoMode: boolean
): Promise<void> {
  const patch = { scheduled_date: date, status: 'scheduled' }
  if (isDemoMode) {
    demoUpdatePlan(itemId, patch)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').update(patch).eq('id', itemId)
}

export async function unscheduleItem(
  userId: string,
  itemId: string,
  isDemoMode: boolean
): Promise<void> {
  const patch = { scheduled_date: null, status: 'library' }
  if (isDemoMode) {
    demoUpdatePlan(itemId, patch)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').update(patch).eq('id', itemId)
}

export async function deleteItem(
  userId: string,
  itemId: string,
  isDemoMode: boolean
): Promise<void> {
  if (isDemoMode) {
    demoDeletePlan(itemId)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').delete().eq('id', itemId)
}

// ── Duplicate to Library ────────────────────────────────────────────
// Duplicates a scheduled item into the library (status='library',
// scheduled_date=null) so the user keeps the original in calendar AND
// has a copy in the library. Per spec: "mejor duplicar, no mover".

export async function duplicateToLibrary(
  userId: string,
  item: ContentItem,
  isDemoMode: boolean
): Promise<void> {
  const { id, created_at, updated_at, scheduled_date, status, ...rest } = item
  const payload = {
    ...rest,
    user_id: userId,
    scheduled_date: null,
    status: 'library' as const,
  }
  if (isDemoMode) {
    demoSavePlan(payload as Record<string, unknown>)
    return
  }
  const supabase = createClient()
  await supabase.from('content_items').insert(payload)
}