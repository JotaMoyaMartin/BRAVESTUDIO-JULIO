/**
 * Prompt builder for Instagram copies. Follows the BRÄVE Content Script Manual:
 * GANCHO → CONTEXTO → SOLUCIÓN → CTA, CTAs conversacionales (never keywords),
 * two content types (autoridad 35-45s / viral 15-30s).
 */

export interface CopyContext {
  topic: string
  type: 'reel' | 'carrusel'
  salonName?: string
  clientName?: string
  tone?: string
  objectives?: string
  services?: string[]
  promoteService?: string
  hasImages?: boolean
  imageCount?: number
  hashtags?: string
}

export function buildCopyPrompt(ctx: CopyContext): string {
  const isCarrusel = ctx.type === 'carrusel'
  const imageHint = ctx.hasImages
    ? `\n\nIMÁGENES DISPONIBLES: ${ctx.imageCount} imágenes del carrusel. El copy debe acompañar al carrusel — no repetir literalmente lo que ya se ve, sino dar contexto y CTA.`
    : ''

  return `Eres un copywriter senior de BRÄVE Content Studio, estudio de contenido para salones de belleza. Escribe un copy de Instagram en español de España (vosotros, "cabello", no "pelo" si suena informal) siguiendo el manual oficial.

MANUAL BRÄVE — Reglas inalterables:
- Estructura: GANCHO (2-5s) → CONTEXTO (5-10s) → SOLUCIÓN (20-30s) → CTA (3-5s)
- GANCHO: detener el scroll, basado en dolor/error/falsa creencia/deseo. PROHIBIDO: "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto", "Esto cambiará tu vida".
- CTA conversacional: "escríbenos y te ayudamos", "reserva tu diagnóstico", "si tienes dudas escríbenos". PROHIBIDO: "Comenta PALABRA", "Escribe INFO", "Pon un ❤️", "Sígueme para más".
- Tono: cercano, profesional, educativo. Vende proceso y confianza, no el servicio en sí.
- 2-4 líneas máximo para el feed. Emojis con moderación (1-2 como mucho, solo si encajan). 1-3 hashtags (# nombre del salón, # servicio, # ciudad). Sin mención a "BRÄVE" en el copy.

CONTEXTO DE LA PUBLICACIÓN:
- Tipo: ${isCarrusel ? 'Carrusel' : 'Reel'}
- Tema: ${ctx.topic}
- Salón: ${ctx.salonName || '—'}
- Ciudad/clienta: ${ctx.clientName || '—'}
- Tono del cliente: ${ctx.tone || 'cercano y profesional'}
- Objetivos: ${ctx.objectives || 'aumentar reservas, autoridad'}
- Servicios principales: ${(ctx.services || []).join(', ') || '—'}
- Servicio a promocionar: ${ctx.promoteService || '—'}${imageHint}

ENTREGA:
Devuelve ÚNICAMENTE el copy de la publicación (el texto que va en el caption). Sin explicaciones, sin "Aquí tienes", sin etiquetas GANCHO/CONTEXTO/etc. Solo el texto final listo para publicar.`
}

/**
 * Mock fallback used when AI is not configured (no AI_API_KEY).
 * Still respects the manual structure so the team can see what good looks like.
 */
export function mockCopy(ctx: CopyContext): string {
  const topic = ctx.topic || 'este servicio'
  const salon = ctx.salonName || 'nuestro salón'
  const cta = `Si estás pensando en ${ctx.promoteService ? `un ${ctx.promoteService.toLowerCase()}` : 'cambiar tu look'}, escríbenos por DM y te ayudamos.`
  if (ctx.type === 'carrusel') {
    return [
      `¿${topic.charAt(0).toUpperCase() + topic.slice(1)}? Te contamos lo que nadie te explica.`,
      `Desliza para ver el antes y después, el proceso y el resultado final 👉`,
      `En ${salon} trabajamos así: diagnóstico, proceso personalizado y resultado que dura. No improvisamos.`,
      cta,
      `${ctx.hashtags || `#${(salon || 'salon').replace(/\s+/g, '')} ${ctx.promoteService ? '#' + ctx.promoteService.replace(/\s+/g, '') : '#estilismo'}`}`,
    ].join('\n\n')
  }
  return [
    `Si tu ${ctx.promoteService || 'color'} dura poco, algo está fallando.`,
    `No siempre es culpa del producto — muchas veces es falta de diagnóstico. Cada cabello tiene un límite y una historia química que hay que respetar.`,
    `Por eso en ${salon} antes de tocar el color hacemos un diagnóstico completo: analizamos la base, el historial y la calidad de la fibra. Así trabajamos differente, y por eso el resultado dura y se mantiene.`,
    cta,
    `#${(salon || 'salon').replace(/\s+/g, '')} ${ctx.promoteService ? '#' + ctx.promoteService.replace(/\s+/g, '') : '#color'} #Madrid`,
  ].join('\n\n')
}