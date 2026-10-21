/**
 * CREAR GUIONES — cerebro de la sección (oct-2026).
 *
 * Recorrido: tema (servicio o idea propia escrita / nota de voz)
 *   → la IA ENTIENDE la idea y propone 5 ganchos de tipos distintos
 *   → la estilista elige uno → guion completo con la estructura que mejor encaja.
 *
 * Basado en el manual BRÄVE (gancho → contexto → solución QUÉ/CÓMO/POR QUÉ → CTA
 * conversacional) enriquecido con estructuras de FÓRMULA 100K adaptadas a salón.
 * La salida del guion sigue siendo compatible con ReelOutput (biblioteca y
 * teleprompter leen script.hook/context/solution/cta).
 */
import { generateAIContent, extractJSON } from '../client'
import { ContentObjective, ReelOutput, serviceLabel, getMockReel } from './reels'

// ─────────────────────────────────────────────────────────────
// Estructuras de guion
// ─────────────────────────────────────────────────────────────

export type StructureId =
  | 'brave' | 'error' | 'mito' | 'caso' | 'tres' | 'versus' | 'espejo' | 'objecion' | 'casa'

export interface ScriptStructure {
  id: StructureId
  name: string
  /** Para qué sirve, en lenguaje de estilista (se muestra en la app). */
  short: string
  /** Bloques en orden (tras el gancho). El último siempre es el CTA. */
  beats: string[]
  /** Instrucciones para la IA. */
  guide: string
}

export const STRUCTURES: ScriptStructure[] = [
  {
    id: 'brave',
    name: 'BRÄVE clásica',
    short: 'Problema, cómo lo resuelves y por qué funciona',
    beats: ['Contexto', 'Solución', 'Cierre'],
    guide: 'CONTEXTO: la situación que vive la clienta, que se vea reflejada (sin dar aún la solución). SOLUCIÓN (la parte más larga): QUÉ haces, CÓMO lo haces (pasos o detalle técnico concreto) y POR QUÉ (la razón profesional). CIERRE: frase de autoridad que resume el valor.',
  },
  {
    id: 'error',
    name: 'Error común',
    short: 'El fallo que casi todas cometen y cómo evitarlo',
    beats: ['Por qué pasa', 'Lo que hago distinto', 'Pasos clave'],
    guide: 'POR QUÉ PASA: explica la causa real del error (técnica o de hábitos), en simple. LO QUE HAGO DISTINTO: el criterio profesional que cambia el resultado. PASOS CLAVE: 2-3 pasos o señales concretas que la clienta puede reconocer o aplicar.',
  },
  {
    id: 'mito',
    name: 'Mito vs realidad',
    short: 'Rompe una creencia popular con criterio profesional',
    beats: ['La creencia', 'La realidad', 'Qué hacer entonces'],
    guide: 'LA CREENCIA: lo que todo el mundo cree y por qué parece lógico. LA REALIDAD: desmonta el mito con una explicación técnica sencilla y un ejemplo cotidiano. QUÉ HACER ENTONCES: la recomendación correcta, concreta.',
  },
  {
    id: 'caso',
    name: 'Caso real',
    short: 'Una clienta, su problema y la transformación',
    beats: ['Cómo llegó', 'Lo que descubrimos', 'El proceso', 'El resultado'],
    guide: 'CÓMO LLEGÓ: la clienta (sin datos identificativos), cómo estaba su cabello y CÓMO SE SENTÍA. LO QUE DESCUBRIMOS: el hallazgo del diagnóstico que explica el problema. EL PROCESO: qué se hizo y por qué, con 1-2 detalles técnicos. EL RESULTADO: el cambio visible y la emoción de la clienta (una frase suya si encaja).',
  },
  {
    id: 'tres',
    name: '3 claves',
    short: 'Tres consejos claros y fáciles de recordar',
    beats: ['Clave 1', 'Clave 2', 'Clave 3', 'Resumen'],
    guide: 'Tres claves numeradas, cada una con QUÉ + POR QUÉ en 1-2 frases. Deben ser distintas entre sí y concretas (nada de "usa buenos productos"). La tercera es la más sorprendente. RESUMEN: una frase que las une.',
  },
  {
    id: 'versus',
    name: 'Básico vs profesional',
    short: 'La misma situación hecha "normal" y hecha bien',
    beats: ['Lo que hace la mayoría', 'Lo que hace una profesional', 'La diferencia'],
    guide: 'LO QUE HACE LA MAYORÍA: la forma rápida/habitual de hacer el servicio, sin atacar a nadie. LO QUE HACE UNA PROFESIONAL: el mismo momento hecho con criterio, con 2-3 detalles concretos (tiempos, productos, diagnóstico). LA DIFERENCIA: cómo se nota en el resultado y en la duración.',
  },
  {
    id: 'espejo',
    name: 'El espejo',
    short: 'Pon en palabras lo que siente tu clienta',
    beats: ['Lo que sientes', 'No es culpa tuya', 'Lo que sí funciona'],
    guide: 'LO QUE SIENTES: verbaliza con detalles cotidianos lo que la clienta piensa o siente (frustración, miedo, inseguridad). NO ES CULPA TUYA: valida y reencuadra el problema con una razón profesional. LO QUE SÍ FUNCIONA: la solución explicada con QUÉ, CÓMO y POR QUÉ.',
  },
  {
    id: 'objecion',
    name: 'Objeción',
    short: 'Responde al "es caro" o "tarda mucho" con valor',
    beats: ['La objeción', 'Lo que hay detrás', 'Lo barato sale caro'],
    guide: 'LA OBJECIÓN: di en voz alta la duda (precio, tiempo, miedo al daño) sin ponerte a la defensiva. LO QUE HAY DETRÁS: el proceso real que justifica el precio o el tiempo (diagnóstico, productos, pasos, formación). LO BARATO SALE CARO: qué pasa cuando se hace sin ese proceso (correcciones, rotura, color que no dura).',
  },
  {
    id: 'casa',
    name: 'Tutorial en casa',
    short: 'Pasos sencillos para cuidar el resultado en casa',
    beats: ['Para quién es', 'Paso a paso', 'El error a evitar'],
    guide: 'PARA QUIÉN ES: filtra a la clienta (tipo de cabello o servicio). PASO A PASO: 3 pasos concretos (producto/gesto/frecuencia) con su porqué. EL ERROR A EVITAR: el gesto habitual que lo estropea.',
  },
]

export function getStructure(id: string | undefined): ScriptStructure {
  return STRUCTURES.find(s => s.id === id) || STRUCTURES[0]
}

/** Estructuras que mejor encajan con cada objetivo (la primera = recomendada). */
const OBJECTIVE_STRUCTURES: Record<ContentObjective, StructureId[]> = {
  autoridad: ['versus', 'error', 'brave', 'mito'],
  reservas: ['caso', 'espejo', 'brave', 'objecion'],
  visibilidad: ['mito', 'tres', 'error', 'versus'],
  educativo: ['tres', 'mito', 'error', 'brave'],
  consejos: ['casa', 'tres', 'error', 'mito'],
  venta: ['objecion', 'caso', 'brave', 'espejo'],
}

export function structuresFor(objective: ContentObjective): StructureId[] {
  return OBJECTIVE_STRUCTURES[objective] || ['brave']
}

// ─────────────────────────────────────────────────────────────
// Objetivos
// ─────────────────────────────────────────────────────────────

export const OBJECTIVES: Array<{ id: ContentObjective; label: string; desc: string }> = [
  { id: 'autoridad', label: 'Autoridad', desc: 'Que te vean como la experta' },
  { id: 'reservas', label: 'Reservas', desc: 'Que te escriban para pedir cita' },
  { id: 'visibilidad', label: 'Visibilidad', desc: 'Llegar a gente nueva' },
  { id: 'educativo', label: 'Educar', desc: 'Enseñar algo concreto' },
  { id: 'consejos', label: 'Consejos', desc: 'Tips fáciles para casa' },
  { id: 'venta', label: 'Venta', desc: 'Invitar a reservar ya' },
]

const OBJECTIVE_BRIEF: Record<ContentObjective, string> = {
  autoridad: 'posicionarla como experta: criterio profesional, explicar el porqué, justificar el valor',
  reservas: 'conseguir conversaciones y citas: casos reales, transformación, CTA directo a reservar o pedir diagnóstico',
  visibilidad: 'llegar a gente nueva: ángulo llamativo, contenido que se guarda y se comparte',
  educativo: 'enseñar algo concreto y útil; CTA suave',
  consejos: 'tips prácticos para casa, sin tecnicismos; CTA suave',
  venta: 'invitar directamente a reservar o comprar, con el valor del proceso por delante',
}

// ─────────────────────────────────────────────────────────────
// Ganchos
// ─────────────────────────────────────────────────────────────

export type HookType = 'error' | 'mito' | 'deseo' | 'caso' | 'pregunta' | 'objecion' | 'contraintuitivo' | 'espejo'

export const HOOK_TYPE_LABEL: Record<HookType, string> = {
  error: 'Error común',
  mito: 'Falso mito',
  deseo: 'Deseo',
  caso: 'Caso real',
  pregunta: 'Pregunta directa',
  objecion: 'Objeción',
  contraintuitivo: 'Sorpresa',
  espejo: 'Identificación',
}

export interface HookOption {
  type: HookType
  /** Lo que se DICE en los primeros 3 segundos. */
  text: string
  /** Lo que se LEE en pantalla (máx. ~7 palabras). */
  onScreen: string
  /** De qué irá el vídeo con este gancho (1 frase). */
  angle: string
  structure: StructureId
}

/** Lo que la IA entendió de la idea — se muestra y viaja al guion para no perder detalles. */
export interface Understanding {
  tema: string
  mensaje: string
  detalles: string[]
}

export interface HooksInput {
  service: string
  idea?: string
  objective: ContentObjective
  brandContext?: string
  /** Ganchos ya vistos (esta sesión y anteriores) — no repetir. */
  avoid?: string[]
  /** Títulos ya guardados en biblioteca. */
  recentTitles?: string[]
  /** Comprensión ya hecha (al pedir "otros ganchos" no se reinterpreta). */
  understanding?: Understanding
}

export interface HooksOutput {
  understanding: Understanding
  hooks: HookOption[]
  mock: boolean
}

// Ángulos para que dos peticiones iguales no den lo mismo: cada petición
// recibe 2 al azar como punto de partida (sin forzar si la idea es propia).
const ANGLE_SEEDS = [
  'el mantenimiento en casa entre citas',
  'lo que la clienta no ve del proceso (diagnóstico, tiempos de pose, protección de la fibra)',
  'el miedo a estropear el cabello',
  'el precio y lo que hay detrás',
  'el momento vital de la clienta (boda, cambio de etapa, vuelta de vacaciones, embarazo)',
  'un error de un vídeo o tendencia de redes',
  'la diferencia entre una foto de Pinterest y su cabello real',
  'la temporada actual y cómo afecta al cabello',
  'lo que pasa a los 2-3 meses del servicio',
  'una pregunta que repiten mucho las clientas en el sillón',
  'el producto que se usa mal en casa',
  'la primera visita y la consulta previa',
  'la expectativa irreal vs lo realista y bonito',
  'el cabello con historial químico (decoloraciones, tintes de caja, alisados)',
]

function pickAngles(n: number): string[] {
  const pool = [...ANGLE_SEEDS]
  const out: string[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  return out
}

function seasonHint(): string {
  const m = new Date().getMonth()
  const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return names[m]
}

const VOICE_RULES = `Idioma: español neutro y cercano, tuteando a la clienta (sirve para España y Latinoamérica). Frases cortas, para decir en voz alta. Nada de tecnicismos sin explicar. Habla la estilista en primera persona ("en mi salón", "yo").`

const HOOK_BANNED = `PROHIBIDO en ganchos: "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto", "Esto cambiará tu vida", "Nadie te cuenta", "La verdad que nadie te dice", "¿Sabías que...?" genérico, o cualquier gancho vago sin un problema/deseo concreto.`

export function buildHooksPrompt(input: HooksInput): string {
  const idea = input.idea?.trim()
  const ideaBlock = idea
    ? `IDEA DE LA ESTILISTA (puede venir de una nota de voz: con muletillas, repeticiones o desordenada — quédate con su INTENCIÓN y con TODOS los detalles concretos que menciona: casos, productos, cifras, frases de clientas, opiniones propias):
"""${idea}"""

${input.understanding
    ? `YA HAS ENTENDIDO ESTA IDEA ASÍ (respétalo):\n- Tema: ${input.understanding.tema}\n- Mensaje: ${input.understanding.mensaje}\n- Detalles: ${input.understanding.detalles.join(' · ') || '—'}\n`
    : ''}
Los 5 ganchos deben hablar de ESTA idea (no de otro tema), cada uno desde un ángulo distinto.`
    : `TEMA: ${input.service}. No hay idea concreta: propón 5 ganchos sobre ${serviceLabel(input.service).el} que sean concretos y poco vistos. Puntos de partida sugeridos para salir de lo típico (úsalos si encajan): ${pickAngles(2).join('; ')}. Estamos en ${seasonHint()}.`

  const avoid = [...(input.avoid || []), ...(input.recentTitles || [])].slice(-60)
  const avoidBlock = avoid.length
    ? `\nYA LE HAS PROPUESTO O YA TIENE ESTOS (NO repitas ni reformules parecido — ni el mismo ángulo):\n${avoid.map(a => `- ${a}`).join('\n')}\n`
    : ''

  const recommended = structuresFor(input.objective)

  return `Eres la directora creativa de BRÄVE, experta en Reels para peluquerías y estilistas. Tu trabajo: entender bien lo que la estilista quiere contar y proponer 5 GANCHOS potentes para su Reel.

SERVICIO: ${input.service}
OBJETIVO: ${input.objective} — ${OBJECTIVE_BRIEF[input.objective]}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}\n` : ''}
${ideaBlock}
${avoidBlock}
CÓMO ES UN BUEN GANCHO (primeros 3 segundos):
- Plantea un problema, error, falsa creencia, deseo u objeción CONCRETO de la clienta de salón.
- Se entiende a la primera, máximo 20 palabras, dicho a cámara.
- Específico: menciona el servicio, una situación reconocible o un dato ("Si tu rubio se vuelve amarillo a las 3 semanas...").
- ${HOOK_BANNED}

LOS 5 GANCHOS deben ser de 5 TIPOS DISTINTOS entre: error, mito, deseo, caso, pregunta, objecion, contraintuitivo, espejo.
A cada gancho asígnale la estructura de guion que mejor lo desarrolla, de esta lista: ${STRUCTURES.map(s => `${s.id} (${s.name})`).join(', ')}. Para este objetivo encajan especialmente: ${recommended.join(', ')}. Usa al menos 3 estructuras distintas entre los 5.

${VOICE_RULES}

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "understanding": {
    "tema": "de qué va, en pocas palabras",
    "mensaje": "la idea principal que la estilista quiere transmitir, en una frase",
    "detalles": ["detalles concretos de su idea que el guion debe incluir (vacío si no hay)"]
  },
  "hooks": [
    {
      "type": "error|mito|deseo|caso|pregunta|objecion|contraintuitivo|espejo",
      "text": "el gancho tal cual se dice a cámara",
      "onScreen": "texto corto en pantalla (máx 7 palabras)",
      "angle": "de qué irá el vídeo con este gancho, en una frase",
      "structure": "id de estructura"
    }
  ]
}`
}

const HOOK_TYPES = Object.keys(HOOK_TYPE_LABEL) as HookType[]
const STRUCTURE_IDS = STRUCTURES.map(s => s.id)

function cleanHooks(raw: unknown): HookOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
    .map(h => ({
      type: (HOOK_TYPES.includes(h.type as HookType) ? h.type : 'pregunta') as HookType,
      text: String(h.text || '').trim(),
      onScreen: String(h.onScreen || '').trim(),
      angle: String(h.angle || '').trim(),
      structure: (STRUCTURE_IDS.includes(h.structure as StructureId) ? h.structure : 'brave') as StructureId,
    }))
    .filter(h => h.text.length > 8)
}

export async function generateHooks(input: HooksInput): Promise<HooksOutput> {
  try {
    const raw = await generateAIContent(buildHooksPrompt(input), { temperature: 0.95 })
    const parsed = extractJSON<{ understanding?: Partial<Understanding>; hooks?: unknown }>(raw)
    const hooks = cleanHooks(parsed?.hooks)
    if (hooks.length >= 3) {
      const u = parsed?.understanding || {}
      return {
        understanding: input.understanding || {
          tema: String(u.tema || input.idea || input.service),
          mensaje: String(u.mensaje || ''),
          detalles: Array.isArray(u.detalles) ? u.detalles.map(String).filter(Boolean).slice(0, 6) : [],
        },
        hooks: hooks.slice(0, 5),
        mock: false,
      }
    }
  } catch {
    // fall through to mock
  }
  return mockHooks(input)
}

function mockHooks(input: HooksInput): HooksOutput {
  const l = serviceLabel(input.service || 'General')
  const idea = input.idea?.trim()
  const base: HookOption[] = [
    { type: 'error', text: `Si ${l.el} te ${l.dura} pocas semanas, el problema no es el tinte: es lo que pasa antes.`, onScreen: `El error con ${l.el}`, angle: 'El fallo previo que hace que el resultado no dure', structure: 'error' },
    { type: 'mito', text: `"Cuanto más producto, mejor." Con ${l.el} es justo al revés.`, onScreen: 'Mito vs realidad', angle: 'Desmontar una creencia sobre el cuidado', structure: 'mito' },
    { type: 'caso', text: `Esta clienta llegó pensando que tendría que cortarse todo. No hizo falta.`, onScreen: 'Antes de cortar, mira esto', angle: 'Una transformación real con diagnóstico', structure: 'caso' },
    { type: 'objecion', text: `"¿Por qué ${l.un} cuesta tanto?" Te enseño lo que no se ve.`, onScreen: 'Lo que pagas de verdad', angle: 'Justificar el valor del proceso', structure: 'objecion' },
    { type: 'deseo', text: `Si quieres ${l.un} que se vea de salón también en casa, haz estas 3 cosas.`, onScreen: '3 claves para que dure', angle: 'Tres hábitos de mantenimiento', structure: 'tres' },
  ]
  return {
    understanding: input.understanding || {
      tema: idea ? (idea.length > 80 ? `${idea.slice(0, 77)}…` : idea) : input.service,
      mensaje: idea ? 'Ejemplo: con la IA conectada aquí verás lo que BRÄVE entendió de tu idea.' : '',
      detalles: [],
    },
    hooks: base,
    mock: true,
  }
}

// ─────────────────────────────────────────────────────────────
// Guion completo
// ─────────────────────────────────────────────────────────────

export interface ScriptBeat {
  label: string
  text: string
  /** Cómo grabarlo / qué mostrar (plano, gesto, B-roll). */
  shot?: string
}

export interface GuionOutput extends ReelOutput {
  structure: StructureId
  hookOnScreen: string
  hookVisual: string
  beats: ScriptBeat[]
  /** Por qué funciona este guion (1 frase, para la estilista). */
  whyItWorks: string
  /** Segundos estimados hablando natural. */
  seconds: number
}

export interface GuionInput {
  service: string
  objective: ContentObjective
  hook: HookOption
  structure: StructureId
  idea?: string
  understanding?: Understanding
  brandContext?: string
  /** Guiones ya escritos en esta sesión: no repetir frases ni enfoque. */
  avoid?: Array<{ title: string; hook: string }>
}

export function buildGuionPrompt(input: GuionInput): string {
  const st = getStructure(input.structure)
  const u = input.understanding
  const ideaBlock = input.idea?.trim()
    ? `IDEA ORIGINAL DE LA ESTILISTA (respétala: el guion va de ESTO; usa sus detalles y su forma de verlo):
"""${input.idea.trim()}"""
${u ? `Lo que entendiste: tema "${u.tema}" · mensaje "${u.mensaje}"${u.detalles.length ? ` · detalles a incluir: ${u.detalles.join(' · ')}` : ''}` : ''}
`
    : ''
  const avoidBlock = input.avoid?.length
    ? `\nYA HA RECIBIDO ESTOS GUIONES (no repitas frases, ejemplos ni enfoque):\n${input.avoid.map(a => `- "${a.title}" (gancho: ${a.hook})`).join('\n')}\n`
    : ''

  return `Eres la directora creativa de BRÄVE y escribes guiones de Reel para estilistas que se graban hablando a cámara en su salón. Escribe UN guion completo, con valor real.

SERVICIO: ${input.service}
OBJETIVO: ${input.objective} — ${OBJECTIVE_BRIEF[input.objective]}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}\n` : ''}${ideaBlock}
GANCHO ELEGIDO (úsalo tal cual o puléelo mínimamente, sin cambiar su sentido):
"${input.hook.text}"
Ángulo: ${input.hook.angle}
${avoidBlock}
ESTRUCTURA: ${st.name}
Bloques en este orden, después del gancho: ${st.beats.join(' → ')} → CTA.
${st.guide}

QUÉ HACE QUE UN GUION TENGA VALOR (obligatorio):
- Al menos UN detalle profesional concreto que una clienta no sabe (un tiempo, una señal, un paso, un porqué técnico explicado simple). Nada de frases vacías como "usamos productos de calidad" o "cada cabello es único" sin explicar.
- Un ejemplo o imagen cotidiana que la clienta reconozca.
- El proceso vende: la clienta debe pensar "ahora entiendo por qué esta profesional trabaja diferente".
- Principios BRÄVE: no vendemos servicios, vendemos confianza; no vendemos color, vendemos seguridad.
- Cada bloque aporta algo nuevo; no repitas la misma idea con otras palabras.

CTA (conversacional, 1 frase): invita a escribir, pedir diagnóstico o reservar. PROHIBIDO pedir comentar una palabra clave ("Comenta RUBIO"), "Sígueme para más", "Pon un corazón". Varía la forma: no empieces siempre por "Si...".

DURACIÓN: 35-50 segundos hablando natural (unas 90-130 palabras entre gancho, bloques y CTA).

${VOICE_RULES}

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "title": "título corto y concreto",
  "coverText": "texto de portada, máx 7 palabras",
  "hook": "gancho final dicho a cámara",
  "hookOnScreen": "texto en pantalla del gancho, máx 7 palabras",
  "hookVisual": "qué se ve en los primeros 3 segundos (plano o acción concreta)",
  "beats": [
    { "label": "${st.beats[0]}", "text": "lo que se dice", "shot": "qué se ve o cómo grabarlo (breve)" }
  ],
  "cta": "llamada a la acción",
  "whyItWorks": "por qué este guion funciona, en una frase para la estilista",
  "seconds": 40,
  "caption": "copy de Instagram de 4-6 líneas: 1ª línea gancho; 2-3 frases con el valor del proceso; cierre conversacional sin palabras clave",
  "hashtags": ["5 hashtags del sector en español, sin #"]
}
"beats" debe tener exactamente ${st.beats.length} bloques con estas etiquetas: ${st.beats.map(b => `"${b}"`).join(', ')}.`
}

/** Mapea los bloques al formato clásico (biblioteca/teleprompter). */
function toClassicScript(hook: string, beats: ScriptBeat[], cta: string): ReelOutput['script'] {
  const first = beats[0]?.text || ''
  const rest = beats.slice(1).map(b => b.text).join(' ')
  return { hook, context: first, solution: rest, cta }
}

export async function generateGuion(input: GuionInput): Promise<{ guion: GuionOutput; mock: boolean }> {
  const st = getStructure(input.structure)
  try {
    const raw = await generateAIContent(buildGuionPrompt(input), { temperature: 0.8 })
    const p = extractJSON<Record<string, unknown>>(raw)
    const beats: ScriptBeat[] = Array.isArray(p?.beats)
      ? (p!.beats as Record<string, unknown>[])
        .map((b, i) => ({ label: String(b?.label || st.beats[i] || `Parte ${i + 1}`), text: String(b?.text || '').trim(), shot: b?.shot ? String(b.shot) : undefined }))
        .filter(b => b.text)
      : []
    if (p && typeof p.title === 'string' && typeof p.hook === 'string' && typeof p.cta === 'string' && beats.length >= 2) {
      const tags = Array.isArray(p.hashtags) ? (p.hashtags as unknown[]).map(t => `#${String(t).replace(/^#/, '').replace(/\s+/g, '')}`).slice(0, 6) : []
      const caption = String(p.caption || '').trim()
      const hook = String(p.hook).trim()
      const cta = String(p.cta).trim()
      return {
        mock: false,
        guion: {
          title: p.title,
          coverText: String(p.coverText || p.title),
          script: toClassicScript(hook, beats, cta),
          visualIdea: String(p.hookVisual || ''),
          captionWithHashtags: tags.length ? `${caption}\n\n${tags.join(' ')}` : caption,
          structure: st.id,
          hookOnScreen: String(p.hookOnScreen || input.hook.onScreen || ''),
          hookVisual: String(p.hookVisual || ''),
          beats,
          whyItWorks: String(p.whyItWorks || ''),
          seconds: Math.min(90, Math.max(15, Number(p.seconds) || 40)),
        },
      }
    }
  } catch {
    // fall through to mock
  }
  return { guion: mockGuion(input), mock: true }
}

function mockGuion(input: GuionInput): GuionOutput {
  const st = getStructure(input.structure)
  const r = getMockReel({ service: input.service, objective: input.objective }, input.hook.text.length)
  const parts = [r.script.context, r.script.solution, 'Por eso en mi salón nunca empezamos sin un diagnóstico: es lo que hace que el resultado dure.', 'Así cuidas el resultado y tu cabello lo agradece.']
  const beats = st.beats.map((label, i) => ({ label, text: parts[i % parts.length], shot: i === 0 ? 'Plano medio hablando a cámara en el salón' : 'Detalle de manos trabajando en el cabello' }))
  return {
    ...r,
    script: toClassicScript(input.hook.text, beats, r.script.cta),
    structure: st.id,
    hookOnScreen: input.hook.onScreen,
    hookVisual: 'Primer plano del cabello antes del servicio',
    beats,
    whyItWorks: 'Ejemplo de muestra: con la IA conectada este guion se escribe a medida de tu idea.',
    seconds: 40,
  }
}

/** Texto completo para copiar. */
export function guionToText(g: GuionOutput): string {
  return [
    `GANCHO:\n${g.script.hook}`,
    ...g.beats.map(b => `${b.label.toUpperCase()}:\n${b.text}`),
    `CTA:\n${g.script.cta}`,
  ].join('\n\n')
}

/** Texto hablado para el teleprompter. */
export function guionSpoken(g: GuionOutput): string {
  return [g.script.hook, ...g.beats.map(b => b.text), g.script.cta].map(s => s.trim()).filter(Boolean).join('\n\n')
}
