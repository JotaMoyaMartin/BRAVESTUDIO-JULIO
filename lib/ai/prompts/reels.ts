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

export function buildReelPrompt(input: ReelInput): string {
  return `Eres un experto en contenido para salones de belleza en Instagram. Crea un guion de Reel siguiendo la metodología BRÄVE.

SERVICIO: ${input.service}
OBJETIVO: ${input.objective}
${input.freeText ? `IDEA/TEMA: ${input.freeText}` : ''}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

METODOLOGÍA OBLIGATORIA:
- GANCHO: Capta atención en el primer segundo. Puede pinchar dolor, generar curiosidad, mostrar error o despertar deseo.
- CONTEXTO: Explica la situación, problema o creencia.
- SOLUCIÓN: Da criterio profesional, consejo, explicación o proceso.
- CTA: Conversacional y directo. Ejemplos: "Escribe RUBIO y te asesoro." / "Guarda este vídeo si quieres cuidar mejor tu cabello."

Duración aproximada: 40-50 segundos hablando natural.

Devuelve EXACTAMENTE este JSON sin texto adicional:
{
  "title": "Título corto y atractivo",
  "coverText": "Texto de portada (máx 8 palabras, impactante)",
  "script": {
    "hook": "Guion del gancho (2-3 frases)",
    "context": "Guion del contexto (3-4 frases)",
    "solution": "Guion de la solución (4-5 frases)",
    "cta": "CTA conversacional (1-2 frases)"
  },
  "visualIdea": "Idea visual natural para grabar (1-2 frases)",
  "captionWithHashtags": "Copy para Instagram + 5 hashtags relevantes para salones de belleza en español"
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
    ctaFn: (s: string) => { const l = serviceLabel(s); return `Si llevas tiempo pensando en hacerte ${l.un} y quieres que lo hagamos bien desde el principio, escribe ${l.cta} y te cuento cómo podríamos conseguirlo.` },
    visualFn: (_s: string) => `Grábate hablando a cámara en tu salón, con luz natural si es posible. Puedes mostrar el proceso de trabajo de fondo.`,
    captionFn: (s: string) => { const l = serviceLabel(s); return `La diferencia entre ${l.un} que ${l.dura} y uno que no, está en el producto. Está en cómo se hace. ✨ Escribe ${l.cta} en los comentarios si quieres que hablemos.\n\n#estilista #${s.replace(/\s/g, '').toLowerCase()} #consejosbelleza #cabelloprofesional #salonbelleza` },
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
    captionFn: (s: string) => { const l = serviceLabel(s); return `Un buen trabajo con ${l.el} no es casualidad. Es diagnóstico + técnica + producto adecuado. 💇‍♀️ ¿Tienes alguna duda? Te leo en comentarios.\n\n#${s.replace(/\s/g, '').toLowerCase()} #estilista #capilar #salonbelleza #cabellosano` },
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
    captionFn: (s: string) => { const l = serviceLabel(s); return `El resultado perfecto con ${l.el} existe. Solo necesita el proceso correcto. ✨ ¿Tienes preguntas? Escríbeme en comentarios o por DM.\n\n#estilista #${s.replace(/\s/g, '').toLowerCase()} #expertacapilar #salonbelleza #cabelloprofesional` },
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
