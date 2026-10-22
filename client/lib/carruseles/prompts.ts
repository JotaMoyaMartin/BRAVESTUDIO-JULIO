/**
 * SISTEMA DE PROMPTS — Carruseles premium.
 *
 * Todo lo que la IA recibe se construye aquí de forma determinista:
 *   - buildCopyPrompt: propone el copy por slide (hook → valor → cierre → CTA)
 *     y asigna el encuadre fotográfico de cada slide (rotación anti-repetición).
 *   - buildHookPrompt / buildTweakPrompt / buildCtaRewritePrompt: micro-ediciones.
 *   - buildSlidePrompt: prompt de imagen de UNA slide =
 *       STYLE SYSTEM (verbatim del estilo) + VISUAL TYPE + COPY EXACTO + firma.
 *
 * Reglas de oro: la IA de copy no inventa visuales raros (validamos y
 * deduplicamos), y la IA de imagen recibe el copy EXACTO con prohibición
 * expresa de añadir, quitar o cambiar palabras.
 */
import { extractJSON } from '@/lib/ai/extract'
import type {
  CopyProposal,
  CopySlide,
  CtaMode,
  Signature,
  SlideRole,
  StyleConfig,
  VisualType,
} from './types'
import { visualTypeLabel, visualTypeSpec } from './styles'

const VALID_VISUALS: VisualType[] = [
  'hero_result',
  'macro_detail',
  'hands_process',
  'tools',
  'product',
  'extensions_material',
  'lifestyle',
  'salon_env',
  'before_after',
]

const VALID_ROLES: SlideRole[] = ['hook', 'desarrollo', 'cierre', 'cta']

const FALLBACK_CYCLE: VisualType[] = [
  'lifestyle',
  'macro_detail',
  'hands_process',
  'tools',
  'extensions_material',
  'product',
  'hero_result',
]

// ── Rotación fotográfica ──────────────────────────────────────────────────────

/** Secuencia de encuadres preferida por el estilo para N slides. */
export function rotationFor(style: StyleConfig, total: number): VisualType[] {
  const seqs = (style.photoDirection.rotation ?? []).map(s => s.sequence).filter(s => s.every(v => VALID_VISUALS.includes(v)))
  const exact = seqs.find(s => s.length === total)
  if (exact) return exact
  const bigger = seqs.filter(s => s.length >= total).sort((a, b) => a.length - b.length)[0]
  if (bigger) return bigger.slice(0, total)
  // fallback: ciclo base sin repetición
  const out: VisualType[] = []
  for (const v of FALLBACK_CYCLE) {
    if (out.length >= total) break
    if (!out.includes(v)) out.push(v)
  }
  while (out.length < total) out.push(FALLBACK_CYCLE[out.length % FALLBACK_CYCLE.length])
  return out
}

/** Asegura encuadres válidos y sin repetición (recoloca repetidos por la rotación). */
export function normalizeSlideVisuals(slides: CopySlide[], style: StyleConfig): CopySlide[] {
  const rotation = rotationFor(style, slides.length >= 6 ? 6 : slides.length || 1)
  const used = new Set<string>()
  return slides.map((s, i) => {
    let visual = s.visual
    if (!VALID_VISUALS.includes(visual) || used.has(visual)) {
      visual = rotation.find(v => !used.has(v)) ?? rotation[i % rotation.length]
    }
    used.add(visual)
    return { ...s, visual }
  })
}

// ── COPY: propuesta completa ─────────────────────────────────────────────────

export interface CopyPromptArgs {
  style: StyleConfig
  topic: string
  slideCount: number | 'auto'
  brandContext?: string
  /** CTA elegido en ajustes antes de generar la propuesta (opcional). */
  ctaHint?: string | null
}

export function buildCopyPrompt({ style, topic, slideCount, brandContext, ctaHint }: CopyPromptArgs): string {
  const countLine =
    slideCount === 'auto'
      ? 'Eliges tú el NÚMERO ideal de slides (entre 3 y 6) según cuánto necesita la idea para explicarse. Prefiere menos si sobra texto.'
      : `El carrusel tiene EXACTAMENTE ${slideCount} slides.`

  return [
    `Eres la redactora sénior de un salón de belleza en España. Escribes el copy de un carrusel de Instagram en español (tuteo, cálido pero profesional). Estilo visual del carrusel: "${style.name}" — ${style.description}.`,
    '',
    'REGLAS DE ESTILO DEL COPY:',
    `• HOOK (slide 1): ${style.copyStyle.hook}`,
    `• CUERPO: ${style.copyStyle.body}`,
    `• CTA (última slide): ${style.copyStyle.cta}`,
    ...style.copyStyle.rules.map(r => `• ${r}`),
    `• Recursos gráficos disponibles para señalar: ${style.graphicElements.join('; ')}.`,
    '',
    topic ? `TEMA QUE QUIERE TRATAR LA ESTILISTA (es tu fuente principal):\n"""\n${topic}\n"""` : '',
    ctaHint ? `CTA A USAR (obligatorio, en la última slide): "${ctaHint}"` : '',
    '',
    countLine,
    '',
    'PARA CADA SLIDE devuelve:',
    '- "text": la frase(s) EXACTAS que se renderizarán en la imagen. Máximo 18 palabras por slide (excluida la slide con CTA). Si la idea tiene una palabra o fragmento a destacar en cursiva/editorial, escríbelo entre ** ** (solo un fragmento por slide, de 2 a 4 palabras).',
    '- "support": (opcional) micro-línea de apoyo en minúsculas tipo label (ej: "puntas pobres · menos cuerpo"). Solo si aporta, máximo 30 caracteres.',
    '- "visual": uno EXACTAMENTE de: ' + VALID_VISUALS.join(', ') + '. Elige la secuencia que mejor CUENTA la historia (ej: lifestyle → macro/problem → proceso → resultado) y NO repitas jamás el mismo visual dos veces.',
    '- "role": hook | desarrollo | cierre | cta (la primera es hook, la última es cta).',
    '',
    'Devuelve además:',
    '- "caption": 1-3 frases para el pie de la publicación en Instagram (sin hashtags).',
    '- "cta": la frase de CTA utilizada.',
    '',
    'ESTRUCTURA NARRATIVA: HOOK (problema/deseo/error/contradicción) → VALOR (explica, corrige o enseña) → CIERRE (consecuencia emocional) → CTA.',
    brandContext ? `\nCONTEXTO DE MARCA DE ESTE SALÓN (úsalos para tono, servicios y clienta ideal):\n${brandContext}` : '',
    '',
    'Responde SOLO con JSON válido, sin texto alrededor, con esta forma:',
    '{"slides":[{"n":1,"role":"hook","text":"...","support":"...","visual":"lifestyle"}],"cta":"...","caption":"..."}',
  ]
    .filter(Boolean)
    .join('\n')
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export function parseCopyProposal(raw: string, style: StyleConfig, slideCount: number | 'auto'): CopyProposal {
  const parsed = extractJSON<{ slides?: unknown[]; cta?: unknown; caption?: unknown }>(raw)
  const rows = Array.isArray(parsed?.slides) ? parsed.slides : null
  if (!rows || rows.length === 0) throw new Error('copy_parse_failed')

  const slides: CopySlide[] = rows
    .filter(isRecord)
    .map((row, i) => ({
      n: i + 1,
      role: VALID_ROLES.includes(row.role as SlideRole) ? (row.role as SlideRole) : i === 0 ? 'hook' : 'desarrollo',
      text: typeof row.text === 'string' ? row.text.trim() : '',
      support: typeof row.support === 'string' && row.support.trim() ? row.support.trim() : undefined,
      visual: (VALID_VISUALS.includes(row.visual as VisualType) ? row.visual : 'lifestyle') as VisualType,
    }))
    .filter(s => s.text.length > 0)
    .slice(0, typeof slideCount === 'number' ? slideCount : 6)

  if (slides.length === 0) throw new Error('copy_parse_failed')

  const fixed = slides.map((s, i) => ({ ...s, n: i + 1 }))
  fixed[0].role = 'hook'
  fixed[fixed.length - 1].role = 'cta'
  fixed[fixed.length - 1].visual = 'hero_result'

  return {
    slides: normalizeSlideVisuals(fixed, style),
    cta: typeof parsed?.cta === 'string' ? parsed.cta : '',
    caption: typeof parsed?.caption === 'string' ? parsed.caption : undefined,
  }
}

// ── COPY: micro-ediciones (hook, tweaks, CTA) ────────────────────────────────

export function buildHookPrompt(args: { style: StyleConfig; topic: string; currentHook: string; brandContext?: string }): string {
  return [
    `Eres la redactora sénior de un salón de belleza en España. Estilo visual "${args.style.name}".`,
    `Estilo de hook: ${args.style.copyStyle.hook}`,
    `TEMA: """${args.topic}"""`,
    `Hook actual (que no convenció): """${args.currentHook}"""`,
    args.brandContext ? `Contexto de marca:\n${args.brandContext}` : '',
    'Devuelve SOLO JSON válido: {"hook":"nueva frase para la primera slide (máximo 12 palabras)","support":"micro-label opcional o vacío"}',
  ]
    .filter(Boolean)
    .join('\n')
}

export type CopyTweak = 'breve' | 'premium' | 'directo' | 'educativo' | 'emocional'

const TWEAK_RULES: Record<CopyTweak, string> = {
  breve: 'Hazlo más brevísculo: frases más cortas, menos palabras, misma verdad.',
  premium: 'Eleva el lenguaje a editorial de moda: más sofisticado y aspiracional, nunca clichés ni cursilería.',
  directo: 'Ve directo al grano: sin rodeos, imperativo suave, cero introducción.',
  educativo: 'Hazlo más didáctico: explica el porqué con precisión profesional, sin tecnicismos innecesarios.',
  emocional: 'Hazlo más emocional: conecta con el anhelo de la clienta, con cómo se verá/se sentirá.',
}

export function buildTweakPrompt(args: { variant: CopyTweak; style: StyleConfig; topic: string; proposal: CopyProposal; brandContext?: string }): string {
  const slidesJson = JSON.stringify(
    args.proposal.slides.map(s => ({ n: s.n, role: s.role, text: s.text, support: s.support ?? '', visual: s.visual })),
  )
  return [
    `Eres la redactora sénior de un salón de belleza en España. Estilo visual "${args.style.name}".`,
    `Estilo del copy: ${args.style.copyStyle.hook} · ${args.style.copyStyle.body}`,
    `TEMA: """${args.topic}"""`,
    `SOLICITUD: ${TWEAK_RULES[args.variant]}`,
    `PROPOSAL ACTUAL (JSON): ${slidesJson}`,
    `CTA actual: "${args.proposal.cta}"`,
    args.brandContext ? `Contexto de marca:\n${args.brandContext}` : '',
    'Devuelve SOLO la propuesta ajustada, en JSON con la MISMA forma: {"slides":[{"n":1,"role":"hook","text":"...","support":"...","visual":"lifestyle"}],"cta":"...","caption":"..."}. Mismo nº de slides y mismos visuales; solo cambia el texto. Mantén los ** ** para el fragmento destacado si lo había.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildCtaRewritePrompt(args: { style: StyleConfig; lastSlide: CopySlide; ctaText: string; brandContext?: string }): string {
  return [
    `Eres la redactora sénior de un salón de belleza. Estilo visual "${args.style.name}".`,
    'Reescribe la ÚLTIMA slide del carrusel para integrar con naturalidad esta llamada a la acción:',
    `CTA a integrar: "${args.ctaText}"`,
    `Texto actual de la última slide: """${args.lastSlide.text}"""${args.lastSlide.support ? ` (apoyo: "${args.lastSlide.support}")` : ''}`,
    args.brandContext ? `Contexto de marca:\n${args.brandContext}` : '',
    'Reglas: máximo 18 palabras; puede conservar parte del cierre si aporta; el CTA al final, conversacional; si el texto actual ya contiene otro CTA, sustitúyelo.',
    'Devuelve SOLO JSON válido: {"text":"texto final integrado","support":"micro-label opcional o vacío"}',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Texto de CTA preparado por modo ('auto' devuelve ''). */
export function ctaTextFor(mode: CtaMode, word?: string): string {
  const w = (word || '').trim().toUpperCase()
  switch (mode) {
    case 'auto': return ''
    case 'escribenos': return '¿Quieres que valoremos tu caso? Escríbenos.'
    case 'reserva': return 'Reserva tu valoración.'
    case 'comenta': return '¿Te ha pasado? Cuéntanoslo en comentarios.'
    case 'guarda': return 'Guarda este carrusel para tu próxima visita.'
    case 'comparte': return 'Compártelo con quien lo necesite.'
    case 'comenta_palabra': return w ? `Comenta "${w}" y te asesoramos.` : 'Comenta y te asesoramos.'
    case 'manual': return ''
    case 'sin_cta': return ''
  }
}

/** Quita la frase de CTA existente del texto de la última slide (best-effort). */
export function stripCtaFromText(text: string, cta: string): string {
  let out = text
  if (cta) out = out.replace(cta, '').trim()
  // patrones frecuentes de CTA al final
  return out
    .replace(/[—–-]?\s*(¿?\s*(escríbenos|escribenos|reserva|comenta|guarda|comparte)[^.\n]*[.!?]?)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── IMAGEN: prompt de una slide ──────────────────────────────────────────────

const sanitizeSignature = (raw: string): string =>
  raw.replace(/[\r\n<>{}\\]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 48)

export interface SlidePromptArgs {
  style: StyleConfig
  slide: Pick<CopySlide, 'text' | 'support' | 'visual'>
  index: number
  total: number
  signature?: Signature
  /** CTA integrado explícito (ej. modo sin_cta → omitir CTA). */
  ctaLine?: string | null
  omitCta?: boolean
}

export function buildSlidePrompt({ style, slide, index, total, signature, ctaLine, omitCta }: SlidePromptArgs): string {
  const sig = signature?.on && signature.text.trim() ? sanitizeSignature(signature.text) : ''
  const spec = visualTypeSpec(slide.visual)
  const varietyHint = total > 1 ? `slide ${index + 1} de ${total}` : 'single slide'

  return [
    `Create one Instagram carousel slide in 4:5 vertical (1080 × 1350). Editorial hair salon campaign, ${varietyHint}, coherent with the rest of the campaign but with a DIFFERENT framing, scale and copy placement than any other slide.`,
    '',
    'STYLE SYSTEM (must follow exactly):',
    style.imagePromptBase,
    '',
    'PALETTE:',
    ...style.palette.rules.map(r => `- ${r}`),
    `Palette tokens: ${style.palette.tokens.map(t => `${t.hex} (${t.name})`).join(', ')}.`,
    '',
    'COMPOSITION:',
    ...style.layoutRules.map(r => `- ${r}`),
    '',
    'PHOTO DIRECTION FOR THIS SLIDE:',
    `- ${spec.prompt}`,
    `${spec.label}`,
    '',
    'WHAT THIS SLIDE IS ABOUT (context for the photo only — never write it in the image):',
    `"${slide.text.replace(/\*\*/g, ' ').replace(/\s+/g, ' ').trim()}${slide.support ? ` — ${slide.support}` : ''}"`,
    '',
    'TEXT: NONE. This is a background photo only. The headline will be added later as an editable layer in the app.',
    'Absolutely NO text, letters, numbers, words, captions, typography, logos or watermarks anywhere in the image.',
    `Leave a calm, uncluttered area of about 40% of the frame (${index === 0 ? 'lower part' : index % 2 ? 'upper part' : 'lower part'}) with simple background so text can sit on top and be read easily.`,
    '',
    'NEVER: add logos, watermarks, brands that do not exist, extra text, captions, buttons, UI elements, stickers or childish decoration. Never distort or destroy the photography. No artificial AI-looking hair. Photorealistic, premium, magazine quality.',
    '',
    ...style.negativeRules.map(r => `- Forbid: ${r}`),
  ]
    .filter(Boolean)
    .join('\n')
}

// ── DEMO (sin IA configurada): propuesta de ejemplo honesta ─────────────────

export const DEMO_PROPOSAL: CopyProposal = {
  slides: [
    {
      n: 1,
      role: 'hook',
      text: '¿TU CABELLO HA PERDIDO DENSIDAD?',
      support: 'no siempre necesitas más largo',
      visual: 'lifestyle',
    },
    {
      n: 2,
      role: 'desarrollo',
      text: 'NO ES SOLO **longitud.**',
      support: 'puntas pobres · mechas rojizas · poco cuerpo',
      visual: 'macro_detail',
    },
    {
      n: 3,
      role: 'desarrollo',
      text: 'LAS PISTAS ESTÁN AQUÍ.',
      support: 'coleta fina · puntas dibujadas',
      visual: 'hands_process',
    },
    {
      n: 4,
      role: 'desarrollo',
      text: 'NO SE TRATA DE PONER MÁS.',
      support: 'se trata de integrar mejor',
      visual: 'extensions_material',
    },
    {
      n: 5,
      role: 'cta',
      text: 'NO TIENE QUE NOTARSE LA TÉCNICA.',
      support: '¿quieres que valoremos tu caso? escríbenos',
      visual: 'hero_result',
    },
  ],
  cta: '¿Quieres que valoremos tu caso? Escríbenos.',
  caption: 'La densidad también se trabaja. Si tu melena se ve vacía aunque sea larga, este carrusel es para ti.',
}
/** Demo por estilo: el texto de ejemplo respeta cómo escribe cada estilo. */
const DEMO_BY_STYLE: Record<string, CopyProposal> = {
  'silencio-autor': {
    slides: [
      { n: 1, role: 'hook', text: '**Un** buen corte puede hacer más por tu pelo que diez productos', visual: 'macro_detail' },
      { n: 2, role: 'desarrollo', text: '**Porque** la forma decide cómo cae', support: 'Si el corte respeta tu caída natural, el pelo se coloca solo y necesitas menos calor.', visual: 'lifestyle' },
      { n: 3, role: 'desarrollo', text: 'Si necesitas **mucho producto**, quizá el problema no es el producto', support: 'Un corte que trabaja en contra no lo arregla ninguna mascarilla.', visual: 'product' },
      { n: 4, role: 'desarrollo', text: '**No** es que tu pelo sea difícil', support: 'Es que todavía no ha tenido el corte que le corresponde.', visual: 'tools' },
      { n: 5, role: 'cta', text: '**Pide** tu diagnóstico de corte', support: 'Veinte minutos para entender tu pelo antes de cortarlo. Escríbenos.', visual: 'hero_result' },
    ],
    cta: 'Escríbenos para tu diagnóstico de corte.',
    caption: 'Antes de comprar otro producto, quizá la pregunta sea otra: ¿tu corte está haciendo su parte?',
  },
  'poster-portada': {
    slides: [
      { n: 1, role: 'hook', text: 'Rubio | Frío', support: 'Sin amarillos, con brillo de cristal', visual: 'hero_result' },
      { n: 2, role: 'desarrollo', text: 'Balayage | Suave', support: 'Raíz difuminada y mantenimiento fácil', visual: 'lifestyle' },
      { n: 3, role: 'desarrollo', text: 'Morena | Glass', support: 'Liso espejo que dura semanas', visual: 'macro_detail' },
      { n: 4, role: 'cta', text: 'Tu cita | Ya', support: 'Reserva en el link de la bio', visual: 'hero_result' },
    ],
    cta: 'Reserva en el link de la bio.',
    caption: 'Los colores que más vamos a ver este otoño en el salón. ¿Cuál es el tuyo?',
  },
}

export function demoProposalFor(styleId: string | null | undefined): CopyProposal {
  const p = (styleId && DEMO_BY_STYLE[styleId]) || DEMO_PROPOSAL
  return { ...p, slides: [...p.slides] }
}
