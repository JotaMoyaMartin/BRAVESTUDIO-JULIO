/**
 * DESIGN TEXTS — textos de plantillas de diseño del módulo clienta "Diseños"
 * (Canva behind the scenes: la clienta JAMÁS ve Canva).
 *
 * Un solo prompt rellena TODOS los campos de texto pedidos como JSON
 * {campo:"texto"} — la respuesta se parsea con el extractJSON canónico y se
 * trimea a maxLength en server. Sin clientes nuevos (regla §7 del repo):
 * el caller usa callLLM (lib/ai/llm.ts) con este prompt.
 */

export interface DesignTextFieldSpec {
  field: string
  label?: string | null
  purpose?: string | null
  maxLength?: number | null
  instructions?: string | null
}

export interface DesignTextsPromptInput {
  fields: DesignTextFieldSpec[]
  /** Nombre de la plantilla (contexto del conjunto). */
  templateName?: string | null
  /** Bloque de contexto del Business Brain (buildBrainContext). */
  brandContext?: string | null
  /** Nota opcional de la clienta (p. ej. qué quiere destacar hoy). */
  note?: string | null
}

/** Tono por propósito (lista cerrada del mapper de plantillas). */
const PURPOSE_TONES: Record<string, string> = {
  gancho: 'GANCHO: frases cortas con impacto, sin clickbait falso; despertar interés en menos de 8 palabras si es posible.',
  desarrollo: 'DESARROLLO: explicar con criterio de estilista experta, lenguaje de clienta (sin tecnicismos innecesarios), 1-2 frases claras.',
  cta: 'CTA: llamada a la acción conversacional y cercana (hablar de su caso, escribirnos, reservar asesoría). PROHIBIDO "comenta X", "escribe INFO", "pon un corazón", "sígueme para más".',
  'objeción': 'OBJECIÓN: responder la duda honesta de una clienta (precio, mantenedores, "daña el pelo") con honestidad y criterio, sin vender humo.',
  deseo: 'DESEO: vender el resultado y cómo se siente, no el servicio; sensorial, concreto, aspiracional pero creíble.',
}

const DEFAULT_TONE = PURPOSE_TONES.desarrollo

/** Reglas fijas del prompt (el builder las envuelve con los datos del request). */
export const DESIGN_TEXTS_PROMPT = `Pauta de estilo:
- Español neutro, voz cercana de una estilista experta hablando con una clienta frente al espejo: natural, directo, con criterio profesional y sin jerga innecesaria.
- Nada de sonar a anuncio generado por IA: frases por las que pasaría una estilista real.
- PROHIBIDO: emojis, hashtags, comillas dentro del texto, empezar con "¡Hola!", "Eres", "En el mundo de", "Como experta(ía)".
- Respeta el máximo de caracteres de cada campo contando en serio (los diseños no encogen tipografía). Mejor un texto corto y preciso que uno recortado.`

export function buildDesignTextsPrompt(input: DesignTextsPromptInput): string {
  const fieldsDesc = input.fields.map(f => {
    const max = f.maxLength && f.maxLength > 0 ? f.maxLength : 120
    const tone = f.purpose ? (PURPOSE_TONES[f.purpose] ?? DEFAULT_TONE) : DEFAULT_TONE
    const extras: string[] = []
    if (f.label) extras.push(`label: ${f.label}`)
    extras.push(`máximo ${max} caracteres`)
    extras.push(tone)
    if (f.instructions) extras.push(`instrucciones del equipo: ${f.instructions}`)
    return `- "${f.field}" (${extras.join(' · ')})`
  }).join('\n')

  const brandBlock = input.brandContext?.trim()
    ? input.brandContext.trim()
    : '(sin ficha de marca — escribe genérico pero creíble de salón)'

  return `Rellena los campos de texto de una plantilla de diseño para una estilista de salón de belleza (cada campo va suelto sobre el diseño, no es un guion).

MARCA DEL SALÓN:
${brandBlock}

${input.templateName ? `PLANTILLA: ${input.templateName}` : ''}
${input.note ? `NOTA DE LA CLIENTA SOBRE QUÉ QUIERE DESTACAR: """${input.note.slice(0, 500)}"""` : ''}

CAMPOS A RELLENAR:
${fieldsDesc}

${DESIGN_TEXTS_PROMPT}

Devuelve EXACTAMENTE este JSON: una entrada por cada campo pedido, con los nombres tal cual están arriba y cada texto cumpliendo SU máximo:
{"<campo>": "<texto>", ...}

Devuelve SOLO el JSON.`
}

/** Trimea y sanea un texto para caber en maxLength (puro, se usa en la ruta). */
export function clampDesignText(text: string, maxLength?: number | null): string {
  const cleaned = text.trim().replace(/^["'«]+|["'»]+$/g, '').replace(/\s+/g, ' ')
  const limit = maxLength && maxLength > 0 ? maxLength : 120
  return cleaned.slice(0, limit)
}