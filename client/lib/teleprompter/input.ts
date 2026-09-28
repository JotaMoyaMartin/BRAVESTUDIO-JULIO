// Teleprompter — transporte y helpers puros (patrón lib/home-today.ts).
// Un solo payload que cualquier generador (Reels, Stories, campañas futuras)
// escribe en sessionStorage para abrir la MISMA experiencia de grabación.

export interface TeleprompterStoryItem {
  label: string // p.ej. "Story 2 de 3"
  text: string // solo el texto hablado de esa story
}

export interface TeleprompterInput {
  script: string // texto hablado a cámara (sin etiquetas tipo "GANCHO:")
  title?: string | null // p.ej. título del reel o "Story 2 de 3"
  source?: 'reel' | 'stories' | 'manual' | null
  returnUrl?: string | null // a dónde volver al terminar (el estado del origen se restaura)
  sequence?: { current: number; total: number; items: TeleprompterStoryItem[] } | null
}

export const TELEPROMPTER_KEY = 'brave_teleprompter_input'
export const TELEPROMPTER_DRAFT_KEY = 'brave_teleprompter_draft'

// --- Transporte (SSR-safe) ---

export function writeTeleprompterInput(input: TeleprompterInput): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(TELEPROMPTER_KEY, JSON.stringify(input))
  } catch {
    /* storage lleno/bloqueado: el teleprompter permite escribir a mano */
  }
}

export function readTeleprompterInput(): TeleprompterInput | null {
  if (typeof window === 'undefined') return null
  try {
    return parseTeleprompterInput(window.sessionStorage.getItem(TELEPROMPTER_KEY))
  } catch {
    return null
  }
}

/** Validación defensiva: solo acepta payloads con script útil. */
export function parseTeleprompterInput(raw: string | null): TeleprompterInput | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.script !== 'string' || !d.script.trim()) return null
  const input: TeleprompterInput = {
    script: d.script,
    title: typeof d.title === 'string' ? d.title : null,
    source: d.source === 'reel' || d.source === 'stories' || d.source === 'manual' ? d.source : null,
    returnUrl: typeof d.returnUrl === 'string' ? d.returnUrl : null,
  }
  if (d.sequence && typeof d.sequence === 'object') {
    const seq = d.sequence as Record<string, unknown>
    const items = Array.isArray(seq.items)
      ? seq.items.filter(
          (it): it is TeleprompterStoryItem =>
            !!it &&
            typeof it === 'object' &&
            typeof (it as Record<string, unknown>).text === 'string' &&
            !!(it as Record<string, unknown>).text,
        )
      : []
    if (items.length > 0) {
      input.sequence = {
        current: typeof seq.current === 'number' ? Math.max(0, Math.min(items.length - 1, seq.current)) : 0,
        total: items.length,
        items,
      }
    }
  }
  return input
}

/** Abre el teleprompter con un payload precargado. Llamadores: Reels, Stories, campañas futuras. */
export function openTeleprompter(input: TeleprompterInput, router: { push: (href: string) => void }): void {
  writeTeleprompterInput(input)
  router.push('/teleprompter')
}

// --- Secuencias (Stories) ---

/** Devuelve el input de la siguiente story de la secuencia, o null si era la última. */
export function buildNextSequenceInput(input: TeleprompterInput): TeleprompterInput | null {
  const seq = input.sequence
  if (!seq || seq.current + 1 >= seq.total) return null
  const nextIdx = seq.current + 1
  const next = seq.items[nextIdx]
  return {
    script: next.text,
    title: next.label,
    source: input.source,
    returnUrl: input.returnUrl,
    sequence: { ...seq, current: nextIdx },
  }
}

// --- Composición de guiones ---

/** Guion de reel hablado: orden natural, sin etiquetas (las etiquetas se leen mal a cámara). */
export function composeReelSpokenScript(script: { hook: string; context: string; solution: string; cta: string }): string {
  return [script.hook, script.context, script.solution, script.cta]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join('\n\n')
}

// --- Archivo y controles ---

/** Nombre de archivo simple, sin caracteres raros: brave-reel-20260928.mp4 | brave-story-2-20260928.webm */
export function fileNameFor(source: string | null | undefined, currentIndex: number | null | undefined, mime: string | null | undefined): string {
  const ext = mime && mime.includes('mp4') ? 'mp4' : 'webm'
  const date = new Date()
  const ds = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const base = source === 'stories' ? `brave-story-${(currentIndex ?? 0) + 1}` : source ? `brave-${source}` : 'brave-video'
  return `${base}-${ds}.${ext}`
}

export const FONT_MIN = 18
export const FONT_MAX = 44
export const FONT_STEP = 4
export const SPEED_MIN = 0.5
export const SPEED_MAX = 2
export const SPEED_STEP = 0.25

export function clampFontSize(px: number): number {
  return Math.max(FONT_MIN, Math.min(FONT_MAX, px))
}

export function clampSpeed(v: number): number {
  return Math.max(SPEED_MIN, Math.min(SPEED_MAX, v))
}

/** Velocidad del texto en px/segundo (base calibrada ~28px/s a 1x en móvil). */
export function speedToPxPerSecond(speed: number, fontSize: number): number {
  return (28 + fontSize) * speed
}