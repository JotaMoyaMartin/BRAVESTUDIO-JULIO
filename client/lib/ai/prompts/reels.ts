import { generateAIContent, extractJSON } from '../client'

export type ContentObjective =
  | 'autoridad' | 'reservas' | 'visibilidad'
  | 'educativo' | 'consejos' | 'venta'

// Maps service keys to natural Spanish expressions with correct gender/number agreement.
// Fields:
//   el  — "el balayage", "las canas"          (para "hablar sobre el/las...")
//   un  — "un balayage", "unas mechas"         (para "hacerse un/unas...")
//   esFacil — "es fácil de mantener" / "son fáciles de mantener"
//   dura    — "dura" / "duran"
//   queda   — "queda" / "quedan"
//   esVerb  — "es" / "son"
//   cta — texto para el CTA en mayúsculas
interface ServiceLabelEntry {
  el: string; un: string; esFacil: string; dura: string; queda: string; esVerb: string; cta: string
}
const SERVICE_LABELS: Record<string, ServiceLabelEntry> = {
  rubios:       { el: 'el cabello rubio',   un: 'un rubio',              esFacil: 'es fácil de mantener',    dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'RUBIO' },
  canas:        { el: 'las canas',          un: 'un tratamiento de canas', esFacil: 'son fáciles de mantener', dura: 'duran',  queda: 'quedan',  esVerb: 'son',  cta: 'CANAS' },
  alisados:     { el: 'el alisado',         un: 'un alisado',            esFacil: 'es fácil de mantener',    dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'ALISADO' },
  balayage:     { el: 'el balayage',        un: 'un balayage',           esFacil: 'es fácil de mantener',    dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'BALAYAGE' },
  mechas:       { el: 'las mechas',         un: 'unas mechas',           esFacil: 'son fáciles de mantener', dura: 'duran',  queda: 'quedan',  esVerb: 'son',  cta: 'MECHAS' },
  tratamientos: { el: 'el tratamiento',     un: 'un tratamiento',        esFacil: 'es fácil de aplicar',     dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'TRATAMIENTO' },
  corte:        { el: 'el corte',           un: 'un corte',              esFacil: 'es fácil de mantener',    dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'CORTE' },
  color:        { el: 'el color',           un: 'un color',              esFacil: 'es fácil de mantener',    dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'COLOR' },
  keratina:     { el: 'la keratina',        un: 'una keratina',          esFacil: 'es fácil de mantener',    dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'KERATINA' },
  decoloración: { el: 'la decoloración',    un: 'una decoloración',      esFacil: 'es fácil de controlar',   dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'DECOLORACIÓN' },
  extensiones:  { el: 'las extensiones',    un: 'unas extensiones',      esFacil: 'son fáciles de mantener', dura: 'duran',  queda: 'quedan',  esVerb: 'son',  cta: 'EXTENSIONES' },
  peinados:     { el: 'los peinados',       un: 'un peinado',            esFacil: 'es fácil de hacer',       dura: 'dura',   queda: 'queda',   esVerb: 'es',   cta: 'PEINADO' },
}

export function serviceLabel(raw: string): ServiceLabelEntry {
  const key = raw.toLowerCase().trim()
  return SERVICE_LABELS[key] || {
    el: `el ${raw.toLowerCase()}`,
    un: `un ${raw.toLowerCase()}`,
    esFacil: 'es fácil de mantener',
    dura: 'dura',
    queda: 'queda',
    esVerb: 'es',
    cta: raw.toUpperCase(),
  }
}

export interface ReelInput {
  service: string
  objective: ContentObjective
  brandContext?: string
  freeText?: string
  /** Guiones ya escritos en esta tanda — el nuevo debe diferenciarse claramente. */
  avoidScripts?: Array<{ title: string; hook: string }>
}

// New objectives map onto the three base tones for the mock generator.
function baseObjective(obj: ContentObjective): 'autoridad' | 'reservas' | 'visibilidad' {
  if (obj === 'educativo' || obj === 'consejos') return 'autoridad'
  if (obj === 'venta') return 'reservas'
  return obj
}

export interface ReelOutput {
  title: string
  coverText: string
  script: {
    hook: string
    context: string
    solution: string
    cta: string
  }
  visualIdea: string
  captionWithHashtags: string
}

// Enfoque del guion según el objetivo elegido (el ESTRUCTURA GANCHO→CONTEXTO→
// SOLUCIÓN→CTA es fija; esto cambia el énfasis y el cierre).
const OBJECTIVE_RULES: Record<ContentObjective, string> = {
  autoridad: 'Guion de AUTORIDAD (35-45 segundos). El objetivo es posicionar, educar, generar confianza, justificar valor y conseguir reservas.',
  reservas: 'Guion para CONSEGUIR RESERVAS (35-45 segundos). Hilo narrativo: un caso real o transformación (sin datos identificativos). El CTA invita directamente a reservar la cita o el diagnóstico.',
  visibilidad: 'Guion de VISIBILIDAD (35-45 segundos). El objetivo es llegar a gente nueva: ángulo muy llamativo y contenido guardable (listón, checklist, comparación).',
  educativo: 'Guion EDUCATIVO (35-45 segundos). Enseña algo concreto y aporta valor real a la clienta — el CTA puede ser suave.',
  consejos: 'Guion de CONSEJOS (35-45 segundos). Tips prácticos y fáciles de aplicar en casa, sin agobios técnicos — el CTA puede ser suave.',
  venta: 'Guion de VENTA (35-45 segundos). El objetivo es invitar de forma directa y natural a reservar o comprar: beneficia + precio justificado por el proceso.',
}

export function buildReelPrompt(input: ReelInput): string {
  // Idea central de la estilista (dictada o escrita): el guion gira SIEMPRE en torno a ella.
  const ideaBlock = input.freeText
    ? `\nIDEA DE LA ESTILISTA (desarrolla ESTE guion exactamente sobre esta idea; NO cambies de tema ni improvises otro distinto):\n${input.freeText}\n`
    : ''
  // Anti-repetición dentro de una tanda: títulos y ganchos ya escritos.
  const avoidBlock = (input.avoidScripts?.length || 0) > 0
    ? `\nEN ESTA MISMA TANDA YA HAS ESCRITO ESTOS GUIONES (NO repitas su ángulo, su gancho, sus frases ni un título parecido — el nuevo guion debe ser CLARAMENTE DISTINTO en ángulo y enfoque):\n${input.avoidScripts!.map(a => `- "${a.title}" (gancho: ${a.hook})`).join('\n')}\nVaría también el TIPO de gancho: si los anteriores parten de un error, usa un falso mito, deseo u objeción.\n`
    : ''

  return `Eres un experto en contenido para salones de belleza en Instagram. Crea un guion de Reel siguiendo EXACTAMENTE el manual oficial BRÄVE Content.

SERVICIO: ${input.service}
OBJETIVO ELEGIDO POR LA ESTILISTA: ${input.objective}
${ideaBlock}${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}${avoidBlock}
TIPO DE GUION SEGÚN EL OBJETIVO — respétalo:
${OBJECTIVE_RULES[input.objective]}

ESTRUCTURA OBLIGATORIA — sigue este orden exacto, nunca lo cambies:

1. GANCHO (3-5 segundos):
   - Detener el scroll. Claro, directo, fácil de entender.
   - Debe estar basado en un DOLOR, un ERROR, una FALSA CREENCIA o un DESEO.
   - Ejemplos válidos: "Si tu rubio dura pocas semanas, algo está fallando." / "No todas las melenas deberían hacerse mechas." / "Antes de cambiar tu color tienes que saber esto."
   - PROHIBIDO: "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto", "Esto cambiará tu vida", o cualquier gancho vago que no plantee un problema concreto.

2. CONTEXTO (5-10 segundos):
   - Generar identificación. La clienta debe verse reflejada.
   - Explica el problema, el error habitual o la situación que vive la clienta.
   - NO expliques todavía la solución. Solo abre el problema.

3. SOLUCIÓN (20-30 segundos) — la parte MÁS IMPORTANTE del guion:
   - Demuestra autoridad, educa y justifica el valor del servicio.
   - Debe explicar obligatoriamente: QUÉ haces, CÓMO lo haces y POR QUÉ lo haces.
   - Ejemplo: "Antes de tocar el color realizamos un diagnóstico (QUÉ). Analizamos la base, el historial químico y la calidad de la fibra (CÓMO). Porque cada cabello tiene límites distintos (POR QUÉ)."
   - La clienta debe pensar: "Ahora entiendo por qué esta profesional trabaja diferente." El proceso vende. El resultado atrae. El proceso convence.

4. CTA (3-5 segundos):
   - Generar conversación, consultas y reservas.
   - NUNCA dependas de palabras clave ni automatizaciones.
   - CTAs válidos: "Si estás pensando en hacerte este servicio, escríbenos y te ayudamos." / "Reserva tu diagnóstico y analizaremos tu caso." / "Si tienes dudas, escríbenos y te asesoramos." / "Agenda una cita y veremos qué necesita tu cabello."
   - PROHIBIDO: "Comenta BALAYAGE", "Escribe INFO", "Pon un corazón", "Sígueme para más", o cualquier CTA basado en palabras clave.

PRINCIPIOS BRÄVE:
- No vendemos servicios, vendemos confianza.
- No vendemos color, vendemos seguridad.
- No vendemos mechas, vendemos resultados bien pensados.
- Toda pieza debe aumentar: autoridad, confianza, valor percibido, diferenciación.

Duración total: 35-45 segundos hablando natural.

Devuelve EXACTAMENTE este JSON sin texto adicional:
{
  "title": "Título corto y atractivo",
  "coverText": "Texto de portada (máx 8 palabras, impactante)",
  "script": {
    "hook": "Guion del gancho (1-2 frases, 3-5 segundos)",
    "context": "Guion del contexto (2-3 frases, 5-10 segundos)",
    "solution": "Guion de la solución explicando QUÉ, CÓMO y POR QUÉ (4-6 frases, 20-30 segundos)",
    "cta": "CTA conversacional sin palabras clave (1 frase, 3-5 segundos)"
  },
  "visualIdea": "Idea visual natural para grabar (1-2 frases)",
  "captionWithHashtags": "Copy para Instagram de 4-6 líneas con esta estructura EXACTA: 1ª línea = gancho que pare el scroll (pregunta o afirmación potente); después 2-3 frases desarrollando la SOLUCIÓN y su valor (qué se hace, cómo y por qué marca la diferencia — la clienta debe sentir que la escribe una experta); y al final un CTA conversacional que invite a escribir o reservar (sin palabras clave) + 5 hashtags del sector belleza en español. Más desarrollado que una sola línea, sin convertirse en un ensayo"
}`
}

const REEL_VARIANTS = [
  {
    titleFn: (s: string) => { const l = serviceLabel(s); return `La verdad sobre ${l.el} que nadie te cuenta` },
    coverFn: (s: string) => { const l = serviceLabel(s); return `Lo que no te dicen sobre ${l.el}` },
    hooks: {
      autoridad: (s: string) => { const l = serviceLabel(s); return `¿Sabes por qué ${l.el} ${l.dura} menos de lo que debería? La mayoría de estilistas no te lo van a decir, pero yo sí.` },
      reservas:  (s: string) => { const l = serviceLabel(s); return `Esta clienta llegó con ${l.el} en un estado que me partió el corazón. Y lo que vino después fue increíble.` },
      visibilidad:(s: string) => { const l = serviceLabel(s); return `Los 3 errores más comunes con ${l.el} que hacen que gastes el doble de dinero sin darte cuenta.` },
    },
    contextFn: (s: string) => { const l = serviceLabel(s); return `Cada semana vienen clientas a mi salón con el mismo problema. Llevan tiempo queriendo hacerse ${l.un}, han investigado, han visto miles de fotos… pero algo no cuadra. El resultado no es lo que esperaban o ${l.dura} mucho menos de lo normal.` },
    solutionFn: (_s: string) => `El secreto está en el diagnóstico previo. Antes de tocar ningún producto, analizo el estado del cabello, la historia de tratamientos anteriores y lo que realmente necesita cada persona. No existe una fórmula universal. Existe la fórmula correcta para ti.`,
    ctaFn: (s: string) => { const l = serviceLabel(s); return `Si llevas tiempo pensando en hacerte ${l.un} y quieres que lo hagamos bien desde el principio, escríbeme y te cuento cómo podríamos conseguirlo.` },
    visualFn: (_s: string) => `Grábate hablando a cámara en tu salón, con luz natural si es posible. Puedes mostrar el proceso de trabajo de fondo.`,
    captionFn: (s: string) => { const l = serviceLabel(s); return `¿Por qué hay ${l.esFacil} y otros no te ${l.dura} ni dos semanas? La diferencia está en el diagnóstico previo, no en la suerte.\n\nAntes de tocar nada, analizamos tu tipo de cabello y diseñamos el proceso correcto. Por eso el resultado se mantiene y tu cabello no sufre.\n\nSi tienes dudas, escríbeme y te asesoro sin compromiso. ✨\n\n#estilista #${s.replace(/\s/g, '').toLowerCase()} #consejosbelleza #cabelloprofesional #salonbelleza` },
  },
  {
    titleFn: (s: string) => { const l = serviceLabel(s); return `Por qué ${l.el} no ${l.queda} como en las fotos` },
    coverFn: (s: string) => { const l = serviceLabel(s); return `El error más común con ${l.el}` },
    hooks: {
      autoridad:  (s: string) => { const l = serviceLabel(s); return `Si alguien te prometió que ${l.el} ${l.esFacil} en casa sin decirte esto, te mintió.` },
      reservas:   (s: string) => { const l = serviceLabel(s); return `Hoy me llegó una clienta con ${l.el} destrozado por un mal proceso. En 3 horas lo transformamos completamente.` },
      visibilidad:(s: string) => { const l = serviceLabel(s); return `5 preguntas que deberías hacer antes de hacerte ${l.un} en cualquier salón.` },
    },
    contextFn: (s: string) => { const l = serviceLabel(s); return `El problema con ${l.el} no ${l.esVerb} el servicio en sí. Es que nadie explica exactamente qué pasa con tu cabello antes, durante y después. Y eso genera expectativas que luego no se cumplen.` },
    solutionFn: (s: string) => { const l = serviceLabel(s); return `En mi salón, antes de hacer ${l.el}, hacemos una consulta de 15 minutos. Analizamos el estado del cabello, hablamos de objetivos realistas y diseñamos un plan personalizado. El resultado no es suerte: es técnica + planificación.` },
    ctaFn: (s: string) => { const l = serviceLabel(s); return `¿Tienes dudas sobre ${l.el}? Escríbeme directamente y te doy mi opinión profesional sin compromiso.` },
    visualFn: (s: string) => { const l = serviceLabel(s); return `Muestra el antes y después de ${l.el} en un corte rápido. O grábate explicando el proceso mientras trabajas.` },
    captionFn: (s: string) => { const l = serviceLabel(s); return `Un buen trabajo con ${l.el} no es casualidad: es diagnóstico + técnica + producto adecuado.\n\nEn mi salón cada ${l.un} empieza con una consulta: miramos tu historial, el estado de tu fibra y qué resultado es realista para ti. El proceso bien hecho es lo que hace que el resultado ${l.dura}.\n\n¿Tienes alguna duda? Escríbeme y te ayudo. 💇‍♀️\n\n#${s.replace(/\s/g, '').toLowerCase()} #estilista #capilar #salonbelleza #cabellosano` },
  },
  {
    titleFn: (s: string) => { const l = serviceLabel(s); return `Lo que cambia cuando ${l.el} se hace bien` },
    coverFn: (s: string) => { const l = serviceLabel(s); return `Esto es lo que nadie te explica sobre ${l.el}` },
    hooks: {
      autoridad:  (s: string) => { const l = serviceLabel(s); return `Hay una cosa que separa un buen resultado con ${l.el} de uno mediocre. Y no es el precio del salón.` },
      reservas:   (s: string) => { const l = serviceLabel(s); return `"Nunca pensé que mi cabello pudiera verse así." Esto me dijo ayer una clienta después de hacerse ${l.el}.` },
      visibilidad:(s: string) => { const l = serviceLabel(s); return `Guarda este vídeo si estás pensando en hacerte ${l.un}. Te va a ahorrar dinero y disgustos.` },
    },
    contextFn: (s: string) => { const l = serviceLabel(s); return `Muchas clientas llegan a mi salón después de malas experiencias con ${l.el}. No porque ${l.esVerb} un servicio difícil, sino porque no se hizo con el protocolo correcto para su tipo de cabello.` },
    solutionFn: (s: string) => { const l = serviceLabel(s); return `El protocolo correcto para ${l.el} empieza mucho antes del sillón. Incluye análisis capilar, elección del producto adecuado y un plan de mantenimiento realista para casa. Sin eso, el resultado ${l.dura} la mitad.` },
    ctaFn: (s: string) => { const l = serviceLabel(s); return `Si quieres hacerte ${l.un} y que el resultado ${l.dura} de verdad, escríbeme. Te explico cómo trabajamos en el salón.` },
    visualFn: (_s: string) => `Grábate en el salón mostrando productos o herramientas mientras explicas. Fondo limpio y buena iluminación.`,
    captionFn: (s: string) => { const l = serviceLabel(s); return `El resultado perfecto con ${l.el} existe: solo necesita el proceso correcto, no productos milagro.\n\nProtocolo completo: análisis capilar, producto adecuado a tu tipo de fibra y un plan de mantenimiento real para casa. Eso es lo que hace que el resultado ${l.dura} de verdad.\n\n¿Tienes preguntas? Escríbeme y te ayudo de verdad. ✨\n\n#estilista #${s.replace(/\s/g, '').toLowerCase()} #expertacapilar #salonbelleza #cabelloprofesional` },
  },
]

export function getMockReel(input: ReelInput, seed?: number): ReelOutput {
  const idx = seed !== undefined ? seed % REEL_VARIANTS.length : Math.floor(Math.random() * REEL_VARIANTS.length)
  const v = REEL_VARIANTS[idx]
  const obj = baseObjective(input.objective)
  return {
    title: v.titleFn(input.service),
    coverText: v.coverFn(input.service),
    script: {
      hook: v.hooks[obj](input.service),
      context: v.contextFn(input.service),
      solution: v.solutionFn(input.service),
      cta: v.ctaFn(input.service),
    },
    visualIdea: v.visualFn(input.service),
    captionWithHashtags: v.captionFn(input.service),
  }
}

/** Hash simple y estable (misma idea → mismo seed) para variar el mock por idea. */
export function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Generates a Reel using the configured LLM (DeepSeek via Ollama), falling
 * back to the deterministic mock on any error (route misconfigured, network
 * failure, invalid JSON, or shape mismatch). The app always renders something.
 *
 * `opts.seed` hace que DISTINTAS ideas caigan en distintas variantes del mock
 * (antes: 3 ideas seleccionadas + IA caída = el mismo guion ×3). El seed se
 * deriva de la idea y sube 1 en cada regeneración para no repetir.
 */
export async function generateReelChecked(input: ReelInput, opts?: { seed?: number }): Promise<{ reel: ReelOutput; mock: boolean }> {
  try {
    const prompt = buildReelPrompt(input)
    const raw = await generateAIContent(prompt)
    const parsed = extractJSON<ReelOutput>(raw)
    if (
      parsed &&
      typeof parsed.title === 'string' &&
      typeof parsed.coverText === 'string' &&
      parsed.script &&
      typeof parsed.script.hook === 'string' &&
      typeof parsed.script.context === 'string' &&
      typeof parsed.script.solution === 'string' &&
      typeof parsed.script.cta === 'string' &&
      typeof parsed.visualIdea === 'string' &&
      typeof parsed.captionWithHashtags === 'string'
    ) {
      return { reel: parsed, mock: false }
    }
  } catch {
    // fall through to mock
  }
  return { reel: getMockReel(input, opts?.seed), mock: true }
}

export async function generateReel(input: ReelInput, opts?: { seed?: number }): Promise<ReelOutput> {
  const { reel } = await generateReelChecked(input, opts)
  return reel
}
