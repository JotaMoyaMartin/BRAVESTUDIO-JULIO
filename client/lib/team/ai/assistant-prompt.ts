/**
 * Prompt del asistente IA context-aware del Modo Equipo.
 *
 * El asistente vive dentro de Clientes → clienta → pestaña Asistente.
 * Conoce el contexto de la marca, el estado del plan de contenidos y las
 * métricas recientes de la clienta. Es conversacional (sugiere, propone,
 * asesora) pero en Fase 1 NO ejecuta acciones — el equipo lo hace en la
 * pestaña Estrategia con los botones existentes.
 */

export interface AssistantContext {
  clientName: string
  brandContext: string       // de buildBrandContextForUser
  ideasSummary: string       // resumen compacto del plan de contenidos
  metricsSummary: string     // resumen compacto de métricas recientes
  section: string             // pestaña/section actual: ficha | estrategia | metricas | …
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const STATUS_LABELS: Record<string, string> = {
  propuesta: 'Propuestas',
  confirmada: 'Confirmadas',
  descartada: 'Descartadas',
  guion_listo: 'Con guion',
  hecha: 'Hechas',
}

/** Resume las ideas agrupadas por status con títulos recientes. */
export function summarizeIdeas(ideas: { status: string; title: string }[]): string {
  if (!ideas || ideas.length === 0) return 'Sin ideas todavía.'
  const buckets: Record<string, string[]> = {}
  for (const i of ideas) {
    const k = STATUS_LABELS[i.status] || i.status
    if (!buckets[k]) buckets[k] = []
    buckets[k].push(i.title)
  }
  const lines: string[] = []
  for (const [label, titles] of Object.entries(buckets)) {
    const recent = titles.slice(0, 5)
    lines.push(`- ${label} (${titles.length}): ${recent.join(' · ')}${titles.length > recent.length ? ' …' : ''}`)
  }
  return lines.join('\n')
}

/** Resume las métricas: último mes por red + delta vs mes anterior. */
export function summarizeMetrics(metrics: {
  month: string; network: string; followers: number | null
  reach: number | null; engagement_rate: number | null; posts_count: number | null
}[]): string {
  if (!metrics || metrics.length === 0) return 'Sin métricas sincronizadas todavía.'
  // Agrupar por red y ordenar por mes
  const byNet: Record<string, typeof metrics> = {}
  for (const m of metrics) {
    if (!byNet[m.network]) byNet[m.network] = []
    byNet[m.network].push(m)
  }
  const lines: string[] = []
  for (const [net, rows] of Object.entries(byNet)) {
    rows.sort((a, b) => a.month.localeCompare(b.month))
    const last = rows[rows.length - 1]
    const prev = rows.length > 1 ? rows[rows.length - 2] : null
    const netLabel = net.charAt(0).toUpperCase() + net.slice(1)
    const parts: string[] = [`${netLabel} (últ. mes ${last.month.slice(0, 7)})`]
    if (last.followers != null) {
      const delta = prev && prev.followers != null ? last.followers - prev.followers : null
      parts.push(`${last.followers} seguidores${delta != null ? ` (${delta >= 0 ? '+' : ''}${delta} vs mes ant.)` : ''}`)
    }
    if (last.reach != null) parts.push(`alcance ${last.reach}`)
    if (last.engagement_rate != null) parts.push(`engagement ${Number(last.engagement_rate).toFixed(2)}%`)
    if (last.posts_count != null) parts.push(`${last.posts_count} posts`)
    lines.push(`- ${parts.join(' · ')}`)
  }
  return lines.join('\n')
}

export function buildAssistantPrompt(
  ctx: AssistantContext,
  history: ChatTurn[],
  newMessage: string,
): string {
  const historyBlock = history.length > 0
    ? history.map(t => `[${t.role}]: ${t.content}`).join('\n') + '\n\n'
    : ''

  const sectionHint: Record<string, string> = {
    ficha: 'El equipo está viendo la ficha del cliente (briefing, equipo, producción). Puedes ayudar a repasar o completar datos del briefing.',
    estrategia: 'El equipo está en la pestaña Estrategia (ideas de contenido y guiones). Puedes proponer ideas, ángulos, hooks, y explicar cómo usar los botones de generar/pegar.',
    metricas: 'El equipo está en la pestaña Métricas (Metricool). Puedes sugerir qué métricas destacar, qué periodos comparar, y cómo interpretar los datos.',
  }
  const sectionLine = sectionHint[ctx.section] || `El equipo está en la sección "${ctx.section}".`

  return `Eres un asesor estratégico de contenido y redes sociales para salones de belleza y peluquería en España. Trabajas dentro de BRÄVE Content Studio, ayudando al equipo (CM/admin) a planificar el contenido de cada clienta.

Estás hablando sobre la clienta: ${ctx.clientName}.
SECCIÓN ACTUAL: ${sectionLine}

═══════════════════════════════════════════
CONTEXTO DE LA MARCA (USA ESTO SIEMPRE):
═══════════════════════════════════════════
${ctx.brandContext || 'Sin brand profile configurado.'}

═══════════════════════════════════════════
ESTADO ACTUAL DEL PLAN DE CONTENIDOS:
═══════════════════════════════════════════
${ctx.ideasSummary}

═══════════════════════════════════════════
MÉTRICAS RECIENTES (si disponible):
═══════════════════════════════════════════
${ctx.metricsSummary}

═══════════════════════════════════════════
TU ROL:
═══════════════════════════════════════════
- Eres conversacional y directa (no corporativa). Responde en español, tono cercano y profesional.
- Sugieres, propones y asesora. NO ejecutas acciones — el equipo lo hace manualmente en la pestaña Estrategia.
- Puedes: proponer retos mensuales, sugerir qué métricas destacar y por qué, proponer ideas de contenido (título + ángulo), responder preguntas sobre el estado de la clienta, recomendar enfoques de contenido basados en las métricas.
- Cuando propongas ideas, da el título + tipo (reel/carrusel) + hook (3-8 palabras) + servicio + objetivo. NO generes guiones completos a menos que te lo pidan.
- Basa tus sugerencias en el contexto de la marca y en las métricas reales cuando estén disponibles.
- Si no hay métricas, dilo y trabaja con lo que tienes.
- Respuestas concisas (máx 200 palabras salvo que pidan detalle). Usa bullets y secciones cortas.

═══════════════════════════════════════════
CONVERSACIÓN:
═══════════════════════════════════════════
${historyBlock}[user]: ${newMessage}

[assistant]:`
}