/**
 * BANCO DE FOTOS BRÄVE (21-oct-2026): fotos conceptuales y minimalistas
 * generadas con IA para la app (sin texto, tonos arena y piedra, centro
 * tranquilo para el titular). Viven en public/banco-ia/<categoría>/.
 *
 * Si el tema habla de algo concreto (rubios, rizos, tijeras…) se usa esa
 * categoría; si no, se elige una al azar pero estable (misma slide = misma foto).
 */
import { BANCO_IA_FILES } from './banco-ia-files'

export type BancoCategoryId =
  | 'melenas' | 'rubios' | 'morenas' | 'castanos' | 'rizos' | 'canas'
  | 'tratamientos' | 'herramientas' | 'producto' | 'texturas' | 'detalle' | 'salon'

export const BANCO_CATEGORIES: Array<{ id: BancoCategoryId; name: string }> = [
  { id: 'melenas', name: 'Melenas' },
  { id: 'rubios', name: 'Rubios' },
  { id: 'morenas', name: 'Morenas' },
  { id: 'castanos', name: 'Castaños y cobrizos' },
  { id: 'rizos', name: 'Rizos y ondas' },
  { id: 'canas', name: 'Canas' },
  { id: 'tratamientos', name: 'Tratamientos' },
  { id: 'herramientas', name: 'Herramientas' },
  { id: 'producto', name: 'Producto' },
  { id: 'texturas', name: 'Texturas' },
  { id: 'detalle', name: 'Detalles' },
  { id: 'salon', name: 'El salón' },
]

export interface BancoPhoto {
  id: string
  src: string
  category: BancoCategoryId
}

export const BANCO_PHOTOS: BancoPhoto[] = BANCO_IA_FILES.map(f => {
  const [category, file] = f.split('/')
  return { id: `ia-${file.replace(/\.jpg$/, '')}`, src: `/banco-ia/${f}`, category: category as BancoCategoryId }
})

// Palabras que delatan el tema (sin tildes, en minúsculas).
const KEYWORDS: Array<[BancoCategoryId, RegExp]> = [
  ['canas', /\bcanas?\b|\bgris(es)?\b|plat(a|eado)|silver|antiedad|envejec/],
  ['rizos', /\brizo|rizad|ondas?\b|ondulad|curly|afro|\bcoily/],
  ['rubios', /rubi[oa]|balayage|mechas|babylights|matiz|decolora|platino|\bblond/],
  ['castanos', /castan|cobriz|pelirroj|caoba|chocolate|caramelo/],
  ['morenas', /moren[oa]|oscur[oa]|negro|brunette/],
  ['tratamientos', /mascarilla|tratamiento|hidrata|keratina|botox|aceite|cuero cabelludo|caida|densidad|lavado|reparar|danad|cuidado/],
  ['herramientas', /tijera|corte|cortar|peine|cepillo|secador|plancha|herramient|flequillo|puntas/],
  ['producto', /producto|serum|champu|acondicionador|crema|rutina en casa/],
  ['texturas', /textura|brillo|encrespa|frizz|porosidad/],
  ['melenas', /melena|largo|volumen|pelo largo|extension/],
  ['salon', /salon|cita|reserva|equipo|estilista|sillon/],
]

/** Categoría que mejor encaja con el texto, o null si no habla de nada concreto. */
export function bancoCategoryFor(text: string | undefined): BancoCategoryId | null {
  if (!text) return null
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [cat, re] of KEYWORDS) if (re.test(t)) return cat
  return null
}

/** Encuadre de la slide (VisualType de carruseles) → categorías afines. */
const BY_VISUAL: Record<string, BancoCategoryId[]> = {
  hero_result: ['melenas', 'rubios', 'morenas', 'castanos', 'rizos'],
  lifestyle: ['melenas', 'morenas', 'rubios', 'castanos', 'canas'],
  macro_detail: ['texturas', 'detalle'],
  hands_process: ['tratamientos', 'salon'],
  tools: ['herramientas'],
  product: ['producto', 'tratamientos'],
  salon_env: ['salon'],
  extensions_material: ['melenas', 'texturas'],
  before_after: ['rubios', 'morenas'],
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Foto del banco para una slide. Prioridad: tema del texto → encuadre →
 * cualquiera. `seed` hace la elección estable; `avoid` evita repetir fotos
 * ya usadas en el mismo carrusel.
 */
export function pickBancoPhoto(opts: { text?: string; visual?: string; seed: string; avoid?: string[] }): string | null {
  if (!BANCO_PHOTOS.length) return null
  const avoid = new Set(opts.avoid || [])
  const fromText = bancoCategoryFor(opts.text)
  const cats = fromText ? [fromText] : (opts.visual && BY_VISUAL[opts.visual]) || []
  const pools = [
    BANCO_PHOTOS.filter(p => cats.includes(p.category) && !avoid.has(p.src)),
    BANCO_PHOTOS.filter(p => !avoid.has(p.src)),
    BANCO_PHOTOS,
  ]
  const pool = pools.find(p => p.length)!
  return pool[hash(opts.seed) % pool.length].src
}
