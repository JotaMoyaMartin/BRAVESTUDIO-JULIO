import { generateAIContent, extractJSON } from '../client'
import { RetoInput, RetoOutput, RetoItem, RetoMissionInput, RetoMissionOutput, RetoMissionItem, RetoMissionBatchInput, RetoMissionBatchOutput, RetoCategory } from '@/types/reto10k'

export function buildRetosPrompt(input: RetoInput): string {
  const services = input.services.length > 0 ? input.services.join(', ') : 'servicios generales de peluquería'
  const count = input.count ?? Math.max(3, Math.min(7, input.postsPerWeek || 4))
  const missionBlock = input.missionTitle
    ? `\nMISIÓN DEL DÍA (OBLIGATORIA — todo el contenido debe orbitar esta misión):\n- Título: ${input.missionTitle}\n- Descripción: ${input.missionDescription || ''}\n- Pista: ${input.missionPromptHint || ''}\nCada reel debe estar claramente conectado a esta misión. Si la misión es sobre un tema concreto, NO generes reels de temas no relacionados.`
    : `\nMISIÓN DEL DÍA: No hay misión específica — genera contenido coherente con la fase actual.`
  return `Eres un guionista profesional para estilistas en Instagram. Sigues el MANUAL OFICIAL DE GUIONES BRÄVE al pie de la letra.

FASE ACTUAL: ${input.currentPhase} — ${input.phaseTitle}
DÍA DEL RETO: ${input.currentDay} de 30
OBJETIVO DE LA USUARIA: ${input.objective === 'recomendado' ? 'Sin objetivo prioritario — aplicar mix equilibrado entre los 6 pilares (autoridad/viralidad/educación/deseo/dolor/objeción)' : input.objective}
SERVICIOS ESTRELLA: ${services}
NIVEL: ${input.level}
PUBLICACIONES POR SEMANA: ${count}
${missionBlock}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

=== MANUAL DE GUIONES BRÄVE (OBLIGATORIO) ===

Filosofía: no vendemos servicios, vendemos confianza. No vendemos color, vendemos seguridad. La meta es que la clienta pase de "No te conozco" a "Quiero que me atiendas tú".

Todos los reels son de AUTORIDAD (35-45s) con esta estructura INALTERABLE:

1. GANCHO (3-5s): detener el scroll. Claro, directo, basado en dolor / error / falsa creencia / deseo.
   - VÁLIDO: "Si tu rubio dura pocas semanas, algo está fallando." / "No todas las melenas deberían hacerse mechas."
   - PROHIBIDO: "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto", "Esto cambiará tu vida".

2. CONTEXTO (5-10s): generar identificación. El problema, el error habitual, la situación. NO expliques la solución todavía.

3. SOLUCIÓN (20-30s) — LA PARTE MÁS IMPORTANTE: demostrar autoridad, educar, justificar valor. Debe explicar con detalle y profundidad:
   - QUÉ haces ("Antes de tocar el color realizamos un diagnóstico")
   - CÓMO lo haces ("Analizamos la base, el historial químico y la calidad de la fibra")
   - POR QUÉ lo haces ("Porque cada cabello tiene límites distintos")
   La clienta debe pensar "Ahora entiendo por qué esta profesional trabaja diferente". El proceso vende. El "solution" debe ser largo y rico, no una frase corta.

4. CTA (3-5s): generar conversación, consultas, reservas. NUNCA palabras clave ni automatizaciones.
   - VÁLIDO: "Si estás pensando en hacerte este servicio, escríbeme y te ayudo." / "Reserva tu diagnóstico y analizamos tu caso." / "Si tienes dudas, escríbeme y te asesoro."
   - PROHIBIDO: "Comenta BALAYAGE", "Escribe INFO", "Pon un corazón", "Sígueme para más".

DURACIÓN: Gancho 3-5s, Contexto 5-10s, Solución 20-30s, CTA 3-5s = 35-45s total.

=== REGLA CRÍTICA: NUNCA menciones el reto ===

ESTRICTAMENTE PROHIBIDO en guiones, títulos, captions o cualquier texto que vea la audiencia:
- Mencionar "reto", "reto 10K", "día 1", "día 15", "día 30", "llevo X días", "30 días", "challenge"
- Cualquier referencia a que la estilista está siguiendo un plan, programa o Challenge
- Frases como "hoy toca...", "como parte de mi reto...", "en este día del reto..."
- La audiencia NO sabe que existe un reto. El contenido debe verse natural, como contenido orgánico espontáneo de la estilista.

La información de fase/día/misión es CONTEXTO INTERNO para ti (la IA) saber qué tema y ángulo abordar, pero NUNCA debe filtrarse al contenido generado.

=== METODOLOGÍA ===

- Genera EXACTAMENTE ${count} reels para esta semana. TODOS de tipo "reel" (sin carruseles).
- Cada reel debe estar conectado a la MISIÓN DEL DÍA y a los SERVICIOS ESTRELLA.
- Varía el pilar de contenido entre los 6 pilares BRÄVE: "autoridad" (educación/consejos/opiniones que demuestran expertise), "viralidad" (ángulo alto impacto/controversia/trending), "educacion" (tutorial/paso a paso/explicar un proceso), "deseo" (aspiracional/antes-después/transformación que genera querer), "dolor" (problema/frustración de la clienta y cómo la resuelves), "objecion" (responder una duda o creencia que frena la reserva).
- El campo "category" debe ser uno de: "autoridad", "viralidad", "educacion", "deseo", "dolor", "objecion".
- Títulos atractivos, NO repetidos, coherentes con la misión. Sin mencionar el reto.
- "hookIdea" es una idea breve de gancho (un ángulo, no el texto literal).
- "caption" es el texto de publicación LISTO PARA COPIAR y pegar en Instagram. Debe seguir EXACTAMENTE este formato:
  · Varios párrafos de texto separados por doble salto de línea (\\n\\n).
  · UN SOLO emoji temático (✨ 💭 💡 🔒 ❤️ 📌 🔥 👇 🌿 ✂️ 🎨 💫 💬) al inicio del PRIMER párrafo, como decoración. El resto de párrafos NO llevan emoji.
  · El penúltimo párrafo es la CTA conversacional (sin hashtag).
  · Después, en un ÚLTIMO párrafo aparte, los hashtags: MÁXIMO 4 hashtags, todos relevantes al tema concreto del reel (no genéricos como #estilista). Formato "#tag1 #tag2 #tag3 #tag4".
  Ejemplo de caption:
  "✨ Lo que me gustaría que supieras antes de hacerte balayage.\\n\\nMuchas clientas llegan con una idea del servicio que no se ajusta a la realidad, y eso acaba en decepción. El problema no es el servicio, es la falta de información.\\n\\nPor eso, antes de tocar el color hago un diagnóstico completo y te explico qué se puede lograr y qué no.\\n\\nSi tienes dudas, escríbeme y te ayudo a aclararlo antes de reservar.\\n\\n#balayage #rubionatural #cabellosano #bravestudio"
- "visual_idea" describe cómo grabar (plano, luz, acción, música).
- "day" = ${input.currentDay}.
- Los "script.hook", "script.context", "script.solution" y "script.cta" deben ser textos reales y desarrollados (especialmente "solution", que debe ser largo y detallado), no esbozos.

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "items": [
    {
      "type": "reel",
      "title": "Título atractivo",
      "service": "Servicio al que pertenece",
      "objective": "autoridad" | "reservas" | "visibilidad",
      "category": "autoridad" | "viralidad" | "educacion" | "deseo" | "dolor" | "objecion",
      "hookIdea": "Idea de gancho breve",
      "format": "Reel 35-45s",
      "script": { "hook": "...", "context": "...", "solution": "...", "cta": "..." },
      "caption": "Texto de publicación con hashtags",
      "visual_idea": "Idea visual para grabar",
      "day": ${input.currentDay}
    }
  ],
  "summary": "Resumen breve del contenido generado"
}`
}

export function generateMockRetos(input: RetoInput): RetoOutput {
  const services = input.services.length > 0 ? input.services : ['Balayage', 'Color', 'Corte']
  const day = input.currentDay
  const phaseTitle = input.phaseTitle || 'Tu fase actual'
  const count = input.count ?? Math.max(3, Math.min(7, input.postsPerWeek || 4))
  const mTitle = input.missionTitle || ''
  const mHint = input.missionPromptHint || ''
  const primary = services[0]
  const secondary = services[services.length > 1 ? 1 : 0]
  const tertiary = services[services.length > 2 ? 2 : 0]
  const missionAngle = mTitle || `tu próxima publicación sobre ${primary}`

  const all: RetoItem[] = [
    {
      type: 'reel',
      title: mTitle ? `Lo que nadie te explica antes de ${mTitle.toLowerCase()}` : `Lo que nadie te explica sobre ${primary}`,
      service: primary,
      objective: input.objective,
      category: 'autoridad',
      hookIdea: mHint || `Dolor o falsa creencia sobre ${primary}`,
      format: 'Reel 35-45s',
      script: {
        hook: `Si estás pensando en ${mTitle ? mTitle.toLowerCase() : `hacerte ${primary}`} y nadie te ha explicado esto, lee con atención.`,
        context: `Muchas clientas llegan al salón con una idea del servicio que no se ajusta a la realidad, y eso acaba en decepción. El problema no es el servicio, es la falta de información antes de empezar.`,
        solution: `Por eso, antes de tocar el color o las tijeras, hago un diagnóstico completo: analizo el estado de la fibra, el historial químico y las expectativas reales de cada clienta. Después explico qué se puede lograr y qué no, qué técnica uso y por qué, y cuánto mantenimiento va a necesitar en casa. Así la clienta decide con criterio, no por impulso, y el resultado se sostiene en el tiempo.`,
        cta: `Si estás pensando en hacerte ${primary} y tienes dudas, escríbeme y te ayudo a aclararlo antes de reservar.`,
      },
      caption: `✨ Lo que me gustaría que supieras antes de ${mTitle ? mTitle.toLowerCase() : `hacerte ${primary}`}.\n\nMuchas clientas llegan con una idea del servicio que no se ajusta a la realidad, y eso acaba en decepción. El problema no es el servicio, es la falta de información antes de empezar.\n\nPor eso, antes de tocar el color o las tijeras, hago un diagnóstico completo: estado de la fibra, historial químico y expectativas reales. Te explico qué se puede lograr y qué no, y cuánto mantenimiento necesitarás en casa.\n\nSi estás pensando en hacerte ${primary} y tienes dudas, escríbeme y te ayudo a aclararlo antes de reservar.\n\n#${primary.replace(/\s/g, '')} #cuidadodelcabello #diagnosticocapilar #bravestudio`,
      visual_idea: `Plano medio tuyo hablando a cámara en el salón, con el material del servicio de fondo. Tono cercano y seguro.`,
      day,
    },
    {
      type: 'reel',
      title: `El error más común con ${primary} (y cómo lo evito)`,
      service: primary,
      objective: input.objective,
      category: 'autoridad',
      hookIdea: `Un error habitual que arruina ${primary}`,
      format: 'Reel 35-45s',
      script: {
        hook: `El error que más veo con ${primary} no es de la clienta, es del profesional que se salta el diagnóstico.`,
        context: `Cada semana reparo trabajos donde se aplicó la misma técnica a melenas distintas. El resultado: daño, color que no dura, clientas frustradas.`,
        solution: `Mi forma de evitarlo es simple: nunca empiezo sin un diagnóstico previo. Miro la fibra al microscopio, valoro el historial químico de los últimos 12 meses y mido la elasticidad del cabello. Solo entonces elijo la técnica, la decoloración y el tono. Trabajo por capas finas, controlo los tiempos de exposición y uso tratamientos reconstructores entre pasos. Así protejo la fibra y consigo un resultado que dura.`,
        cta: `¿Te has llevado un susto con ${primary}? Cuéntamelo por mensaje y te digo si tiene solución.`,
      },
      caption: `🔒 El error más común con ${primary} no es de la clienta, es del profesional que se salta el diagnóstico.\n\nCada semana reparo trabajos donde se aplicó la misma técnica a melenas distintas. El resultado: daño, color que no dura, clientas frustradas.\n\nMi forma de evitarlo: nunca empiezo sin diagnóstico previo. Miro la fibra, valoro el historial químico de los últimos 12 meses y mido la elasticidad. Solo entonces elijo técnica, decoloración y tono.\n\n¿Te has llevado un susto con ${primary}? Cuéntamelo por mensaje y te digo si tiene solución.\n\n#${primary.replace(/\s/g, '')} #errorescapilares #cabellosano #bravestudio`,
      visual_idea: `Primer plano de tus manos trabajando, después corte a ti explicando a cámara.`,
      day,
    },
    {
      type: 'reel',
      title: `Transformación real de ${secondary} en el salón`,
      service: secondary,
      objective: input.objective,
      category: 'deseo',
      hookIdea: `Antes y después con el proceso explicado`,
      format: 'Reel 35-45s',
      script: {
        hook: `Esta clienta llevaba años queriendo un cambio y nadie le daba una salida realista.`,
        context: `Llegó con el pelo dañado por decoloraciones anteriores y miedo a volver a intentarlo. Lo que necesitaba no era más color, era un plan.`,
        solution: `Empezamos por un protocolo de reconstrucción de tres semanas. Después hice un ${secondary.toLowerCase()} trabajando desde la raíz solo donde la fibra lo permitía, respetando la elasticidad natural. Apliqué un tono matizador con bajo % de oxidante y sellé con un tratamiento ácido. El proceso tardó cuatro horas, pero el resultado fue un color limpio, sano y con brillo real.`,
        cta: `Si tienes un caso parecido y quieres una opinión honesta, escríbeme y valoro tu caso sin compromiso.`,
      },
      caption: `✨ Esta clienta llevaba años queriendo un cambio y nadie le daba una salida realista.\n\nLlegó con el pelo dañado por decoloraciones anteriores y miedo a volver a intentarlo. Lo que necesitaba no era más color, era un plan.\n\nEmpezamos por un protocolo de reconstrucción de tres semanas. Después hice un ${secondary.toLowerCase()} trabajando solo donde la fibra lo permitía, con tono matizador y sellado ácido. Cuatro horas de proceso, brillo real al final.\n\nSi tienes un caso parecido y quieres una opinión honesta, escríbeme y valoro tu caso sin compromiso.\n\n#${secondary.replace(/\s/g, '')} #antesydespues #reconstruccioncapilar #bravestudio`,
      visual_idea: `Montaje antes → proceso → después, con música emocional y cortes limpios.`,
      day,
    },
    {
      type: 'reel',
      title: `El proceso de ${tertiary} paso a paso`,
      service: tertiary,
      objective: input.objective,
      category: 'educacion',
      hookIdea: `Así trabajo un ${tertiary} de verdad`,
      format: 'Reel 35-45s',
      script: {
        hook: `Si crees que un buen ${tertiary.toLowerCase()} es solo cortar, te falta ver cómo lo hago yo.`,
        context: `Un ${tertiary.toLowerCase()} bien hecho respeta la dirección natural del pelo, el tipo de rostro y el estilo de vida de la clienta. No es estándar, es a medida.`,
        solution: `Empiezo observando cómo cae el pelo limpio y seco, identifico la dirección de crecimiento y las zonas con más volumen. Después dibujo la guía en la nuca y trabajo de dentro a fuera respetando la densidad de cada zona. Acabo con un texturizado ligero solo en las puntas para dar movimiento sin perder forma, y repaso el contorno para que el peinado en casa sea fácil. Cada paso tiene un por qué.`,
        cta: `Si quieres un ${tertiary.toLowerCase()} pensado para tu pelo, reserva una consulta y lo hacemos a medida.`,
      },
      caption: `✂️ Si crees que un buen ${tertiary.toLowerCase()} es solo cortar, te falta ver cómo lo hago yo.\n\nUn ${tertiary.toLowerCase()} bien hecho respeta la dirección natural del pelo, el tipo de rostro y el estilo de vida. No es estándar, es a medida.\n\nEmpiezo observando cómo cae el pelo limpio y seco, dibujo la guía en la nuca y trabajo de dentro a fuera respetando la densidad de cada zona. Acabo con texturizado ligero en puntas y repaso el contorno. Cada paso tiene un por qué.\n\nSi quieres un ${tertiary.toLowerCase()} pensado para tu pelo, reserva una consulta y lo hacemos a medida.\n\n#${tertiary.replace(/\s/g, '')} #corteamano #cortepersonalizado #bravestudio`,
      visual_idea: `Cámara sobre el hombro mientras trabajas, mostrando cada paso con cortes rápidos.`,
      day,
    },
    {
      type: 'reel',
      title: mTitle ? `Por qué hago lo que hago: ${missionAngle}` : `Mi historia: por qué soy estilista`,
      service: primary,
      objective: input.objective,
      category: 'viralidad',
      hookIdea: `No siempre quise ser estilista. Esto es lo que cambió.`,
      format: 'Reel 35-45s',
      script: {
        hook: `No me hice estilista por moda. Me hice porque alguien me enseñó que cambiar un pelo puede cambiar un día.`,
        context: `Al principio veía esto como un trabajo más. Hasta que una clienta me contó que no se había reconocido en el espejo en meses, y que salir del salón le devolvió algo que había perdido. Ahí entendí el oficio.`,
        solution: `Desde entonces trabajo así: escucho a la clienta antes de proponer nada, le pregunto qué necesita de su pelo y para qué, y traduzco eso en una técnica y un plan realistas. No busco impresionar, busco que se reconozca al mirarse. Esa es la diferencia que me mantiene haciendo esto cada día, y la que intento transmitir en cada cita.`,
        cta: `¿Tú también sientes que tu pelo no te representa? Cuéntamelo, me interesa leerte.`,
      },
      caption: `❤️ No me hice estilista por moda. Me hice porque alguien me enseñó que cambiar un pelo puede cambiar un día.\n\nAl principio veía esto como un trabajo más. Hasta que una clienta me contó que no se había reconocido en el espejo en meses, y que salir del salón le devolvió algo que había perdido. Ahí entendí el oficio.\n\nDesde entonces escucho a la clienta antes de proponer nada, le pregunto qué necesita de su pelo y para qué, y traduzco eso en un plan realista. No busco impresionar, busco que se reconozca al mirarse.\n\n¿Tú también sientes que tu pelo no te representa? Cuéntamelo, me interesa leerte.\n\n#${primary.replace(/\s/g, '')} #mihistoria #vocacion #bravestudio`,
      visual_idea: `Tú en el salón preparando el puesto mientras hablas a cámara, tono íntimo.`,
      day,
    },
    {
      type: 'reel',
      title: `Una pregunta para mi comunidad sobre ${primary}`,
      service: primary,
      objective: input.objective,
      category: 'dolor',
      hookIdea: `Quiero leer tu respuesta`,
      format: 'Reel 35-45s',
      script: {
        hook: `Tengo una pregunta para ti y de verdad quiero leer tu respuesta, no un emoji.`,
        context: `Después de años en el salón, lo que más me ayuda a mejorar no son las tendencias, sino lo que me cuentan las clientas reales.`,
        solution: `Hoy te pregunto: ¿cuál es la parte de tu pelo que más te cuesta manejar y qué has probado hasta ahora? Con tus respuestas preparé contenido de las próximas semanas, así que cuento contigo. Leo todos los comentarios y respondo siempre que puedo. Y si tu caso es más personal, mi privado está abierto.`,
        cta: `Cuéntamelo en comentarios, los leo todos y te respondo.`,
      },
      caption: `💬 Tengo una pregunta para ti y de verdad quiero leer tu respuesta, no un emoji.\n\nDespués de años en el salón, lo que más me ayuda a mejorar no son las tendencias, sino lo que me cuentan las clientas reales.\n\nHoy te pregunto: ¿cuál es la parte de tu pelo que más te cuesta manejar y qué has probado hasta ahora? Con tus respuestas preparé el contenido de las próximas semanas.\n\nCuéntamelo en comentarios, los leo todos y te respondo.\n\n#${primary.replace(/\s/g, '')} #comunidad #dudascapilares #bravestudio`,
      visual_idea: `Habla a cámara en tu salón, tono cercano y cálido, sin música fuerte.`,
      day,
    },
    {
      type: 'reel',
      title: `El antes y después que más me enorgullece de ${tertiary}`,
      service: tertiary,
      objective: input.objective,
      category: 'objecion',
      hookIdea: `El cambio que más me enorgullece`,
      format: 'Reel 35-45s',
      script: {
        hook: `Este es el antes y después que más me enorgullece, y no por el color, por el proceso detrás.`,
        context: `La clienta venía de dos servicios fallidos en otro sitio y estaba a punto de dejarlo. Necesitaba confianza, no solo técnica.`,
        solution: `Hice un diagnóstico honesto, le expliqué qué se podía salvar y qué no, y monté un plan de tres sesiones: primero reconstrucción, después ${tertiary.toLowerCase()} respetando la fibra, y por último un tono matizador suave. Trabajé con decoloraciones de bajo volumen, tiempos controlados y tratamientos intermedios. El resultado no fue solo estético, fue una clienta que volvió a confiar en su pelo y en su estilista.`,
        cta: `Si vienes de una experiencia parecida, escríbeme y te doy una opinión honesta de lo que se puede hacer.`,
      },
      caption: `🔥 Este es el antes y después que más me enorgullece, y no por el color, por el proceso detrás.\n\nLa clienta venía de dos servicios fallidos en otro sitio y estaba a punto de dejarlo. Necesitaba confianza, no solo técnica.\n\nHice un diagnóstico honesto, le expliqué qué se podía salvar y monté un plan de tres sesiones: reconstrucción, ${tertiary.toLowerCase()} respetando la fibra y tono matizador suave. Trabajé con bajo volumen, tiempos controlados y tratamientos intermedios.\n\nSi vienes de una experiencia parecida, escríbeme y te doy una opinión honesta de lo que se puede hacer.\n\n#${tertiary.replace(/\s/g, '')} #antesydespues #reconstruccioncapilar #bravestudio`,
      visual_idea: `Antes y después con música emocional, cortes lentos para dejar ver el detalle.`,
      day,
    },
  ]

  // Selección respetando el count pedido con balance 40/40/20
  const items = all.slice(0, count)

  return {
    items,
    summary: `${items.length} ideas de reels para la misión "${missionAngle}" · fase "${phaseTitle}" · día ${day}.`,
  }
}

export async function generateRetos(input: RetoInput): Promise<RetoOutput> {
  try {
    const raw = await generateAIContent(buildRetosPrompt(input))
    const parsed = extractJSON<{ items: Array<Omit<RetoItem, 'day'>>, summary: string }>(raw)
    if (
      parsed &&
      Array.isArray(parsed.items) &&
      parsed.items.length > 0 &&
      parsed.items.every(
        it =>
          it &&
          it.type === 'reel' &&
          typeof it.title === 'string' &&
          typeof it.service === 'string' &&
          typeof it.hookIdea === 'string' &&
          typeof it.format === 'string' &&
          it.script &&
          typeof it.script.hook === 'string' &&
          typeof it.script.context === 'string' &&
          typeof it.script.solution === 'string' &&
          typeof it.script.cta === 'string'
      )
    ) {
      const items: RetoItem[] = parsed.items.map((it, i) => ({
        ...it,
        type: 'reel',
        day: input.currentDay,
        objective: it.objective || input.objective,
        category: it.category || (['autoridad', 'viralidad', 'educacion', 'deseo', 'dolor', 'objecion'][i % 6]),
        caption: it.caption || '',
        visual_idea: it.visual_idea || '',
      }))
      return {
        items,
        summary: typeof parsed.summary === 'string' ? parsed.summary : `${items.length} ideas generadas.`,
      }
    }
  } catch {
    // fall through to mock
  }
  return generateMockRetos(input)
}

// ── Generación de item único para la misión del día ───────────────────

export function buildMissionPrompt(input: RetoMissionInput): string {
  const services = input.services.length > 0 ? input.services.join(', ') : 'servicios generales de peluquería'
  return `Eres un guionista profesional para estilistas en Instagram. Sigues el MANUAL OFICIAL DE GUIONES BRÄVE al pie de la letra.

MISIÓN DEL DÍA (OBLIGATORIA — el reel debe estar 100% dedicado a esta misión):
- Título: ${input.missionTitle}
- Descripción: ${input.missionDescription || ''}
- Pista: ${input.missionPromptHint || ''}
Fase actual: ${input.currentPhase} — ${input.phaseTitle}
Día del reto: ${input.currentDay} de 30
Servicios estrella: ${services}
Nivel: ${input.level}
${input.brandContext ? `Contexto del salón: ${input.brandContext}` : ''}

=== MANUAL DE GUIONES BRÄVE (OBLIGATORIO) ===

Filosofía: no vendemos servicios, vendemos confianza. La meta es que la clienta pase de "No te conozco" a "Quiero que me atiendas tú".

El reel es de AUTORIDAD (35-45s) con esta estructura INALTERABLE:

1. GANCHO (3-5s): detener el scroll. Claro, directo, basado en dolor / error / falsa creencia / deseo.
   - VÁLIDO: "Si tu rubio dura pocas semanas, algo está fallando."
   - PROHIBIDO: "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto".

2. CONTEXTO (5-10s): generar identificación. El problema, el error habitual. NO expliques la solución todavía.

3. SOLUCIÓN (20-30s) — LA PARTE MÁS IMPORTANTE: demostrar autoridad, educar.
   - QUÉ haces, CÓMO lo haces, POR QUÉ lo haces.
   - Debe ser largo, detallado y rico. El proceso vende.

4. CTA (3-5s): conversacional. NUNCA palabras clave ni automatizaciones.
   - VÁLIDO: "Si estás pensando en hacerte este servicio, escríbeme y te ayudo."
   - PROHIBIDO: "Comenta BALAYAGE", "Escribe INFO".

=== REGLA CRÍTICA: NUNCA menciones el reto ===

ESTRICTAMENTE PROHIBIDO en guiones, títulos, captions o cualquier texto que vea la audiencia:
- Mencionar "reto", "reto 10K", "día 1", "día 15", "día 30", "llevo X días", "30 días", "challenge"
- Cualquier referencia a que la estilista está siguiendo un plan, programa o challenge
- Frases como "hoy toca...", "como parte de mi reto...", "en este día del reto..."
- La audiencia NO sabe que existe un reto. El contenido debe verse natural, como contenido orgánico espontáneo.

=== ENTREGABLE ===

Genera EXACTAMENTE 1 reel dedicado a la misión de hoy. Campos:

- "type": "reel"
- "title": título atractivo conectado a la misión
- "service": servicio al que pertenece
- "objective": "autoridad" | "reservas" | "visibilidad"
- "category": "autoridad" | "viralidad" | "educacion" | "deseo" | "dolor" | "objecion" (según la misión)
- "hookIdea": idea breve de gancho (un ángulo)
- "format": "Reel 35-45s"
- "script": { "hook": "...", "context": "...", "solution": "...", "cta": "..." } — textos reales y desarrollados, especialmente "solution" largo y detallado
- "caption": texto LISTO PARA COPIAR y pegar en Instagram. Varios párrafos separados por \\n\\n. UN SOLO emoji temático al inicio del primer párrafo. Penúltimo párrafo = CTA conversacional. Último párrafo = máx 4 hashtags relevantes.
- "visual_idea": cómo grabar (plano, luz, acción, música)
- "recording_tip": recomendación práctica de grabación: plano recomendado, duración de cada bloque, luz, música, expresión, ángulo. Texto concreto y accionable.
- "day": ${input.currentDay}

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "item": {
    "type": "reel",
    "title": "...",
    "service": "...",
    "objective": "...",
    "category": "...",
    "hookIdea": "...",
    "format": "Reel 35-45s",
    "script": { "hook": "...", "context": "...", "solution": "...", "cta": "..." },
    "caption": "...",
    "visual_idea": "...",
    "recording_tip": "...",
    "day": ${input.currentDay}
  },
  "summary": "Resumen breve"
}`
}

// ── Mock data coherente por fase ─────────────────────────────────────

interface MockInput {
  mTitle: string
  mHint: string
  mDesc: string
  primary: string
  services: string[]
  day: number
  phase: number
  objective: string
}

function buildMockItem(input: MockInput): RetoMissionItem {
  const { mTitle, mHint, mDesc, primary, services, day, phase, objective } = input
  const secondary = services[services.length > 1 ? 1 : 0]
  const tert = services[services.length > 2 ? 2 : 0]
  const tag = primary.replace(/\s/g, '').toLowerCase()

  // Fase 1: Autenticidad — presentacion personal, historia, salon
  if (phase === 1) {
    return {
      type: 'reel',
      title: mTitle,
      service: primary,
      objective,
      category: 'autoridad',
      hookIdea: mHint || `Tu historia, tu autenticidad`,
      format: 'Reel 35-45s',
      script: {
        hook: `Si te tengo que contar algo sobre ${mTitle.toLowerCase()}, es esto: nadie va a conectar contigo si no te muestras real.`,
        context: `${mDesc || 'Muchas estilistas esconden su historia detrás del trabajo.'} Lo que la gente quiere ver no es perfección, quiere ver persona. Tu trayectoria, tus dudas, lo que te llevó hasta aquí.`,
        solution: `Por eso hoy te cuento esto sin filtros. ${mHint || 'Te cuento mi historia y por qué hago lo que hago.'} Llevo años en esto, he cometido errores de los que he aprendido, y cada clienta que se sienta en mi silla me enseña algo nuevo. Mi forma de trabajar nace de todo eso: no es solo técnica, es criterio. Y ese criterio es lo que me hace diferente, porque nadie ha vivido lo mismo que yo ni ha aprendido las mismas lecciones. Cuando una clienta viene a verme, no viene solo por un servicio, viene por la forma en que yo lo hago.`,
        cta: `Si todavía no me conoces, escríbeme por Instagram y te cuento más sobre cómo trabajo.`,
      },
      caption: `✨ ${mTitle}\n\n${mDesc || 'Hoy quiero mostrarte quién soy y por qué hago lo que hago.'} Lo que la gente quiere ver no es perfección, quiere ver persona.\n\n${mHint || 'Mi historia, mi trayectoria y lo que me hace diferente.'} Cada clienta me enseña algo nuevo y eso se nota en cómo trabajo.\n\nSi todavía no me conoces, escríbeme por Instagram y te cuento más.\n\n#${tag} #estilista #mihistoria #bravestudio`,
      visual_idea: `Plano medio en tu salón, hablando a cámara con naturalidad. Sin poses, sin guion rígido. Muestra tu espacio de fondo para dar contexto.`,
      recording_tip: `Plano frontal a altura de ojos, luz natural de ventana. Habla como si le estuvieras contando algo a una amiga. Empieza con energía (3-5s), baja el ritmo en contexto (5-10s), habla desde el corazón en la solución (20-30s), cierra con cercanía en el CTA (3-5s). Vertical 9:16.`,
      day,
    }
  }

  // Fase 2: Autoridad — consejos, errores, educacion, mitos
  if (phase === 2) {
    return {
      type: 'reel',
      title: mTitle,
      service: primary,
      objective,
      category: 'autoridad',
      hookIdea: mHint || `Conocimiento que solo un pro tiene`,
      format: 'Reel 35-45s',
      script: {
        hook: `Lo que voy a contarte sobre ${mTitle.toLowerCase()} es algo que solo aprendes después de años haciéndolo.`,
        context: `${mDesc || 'Hay cosas que las clientas no saben y que les cambiarían la relación con su pelo.'} El problema es que hay mucha información falsa dando vueltas, y eso confunde más de lo que ayuda.`,
        solution: `Como profesional, mi trabajo no es solo hacer el servicio, es educar. ${mHint || 'Te comparto lo que he aprendido en años de experiencia.'} Cuando una clienta entiende por qué pasa lo que pasa con su pelo, toma mejores decisiones. Y cuando toma mejores decisiones, el resultado dura más y se ve mejor. Por eso me tomo tiempo en cada cita para explicar lo que hago, por qué lo hago y qué puede esperar. No es tiempo perdido, es inversión en confianza.`,
        cta: `¿Tienes una duda sobre ${primary.toLowerCase()}? Escríbeme y te respondo sin compromiso.`,
      },
      caption: `💡 ${mTitle}\n\n${mDesc || 'Hay cosas que solo aprendes después de años haciéndolo.'} Hay mucha información falsa dando vueltas y eso confunde más de lo que ayuda.\n\nComo profesional, mi trabajo no es solo hacer el servicio, es educar. Te explico lo que hago, por qué lo hago y qué puedes esperar. No es tiempo perdido, es inversión en confianza.\n\n¿Tienes una duda? Escríbeme y te respondo sin compromiso.\n\n#${tag} #consejopro #cuidadodelcabello #bravestudio`,
      visual_idea: `Primer plano hablando a cámara, mostrando quizás un utensilio o producto relacionado. Tono didáctico pero cercano, no de clase magistral.`,
      recording_tip: `Plano frontal, buena luz. Usa las manos para enfatizar puntos clave. Empieza fuerte con el gancho (3-5s), contextualiza el problema (5-10s), explica la solución con detalle (20-30s), invita a escribir (3-5s). Vertical 9:16.`,
      day,
    }
  }

  // Fase 3: Deseo — transformaciones, antes/después, casos reales
  if (phase === 3) {
    return {
      type: 'reel',
      title: mTitle,
      service: primary,
      objective,
      category: 'deseo',
      hookIdea: mHint || `Transformacion que impacta`,
      format: 'Reel 35-45s',
      script: {
        hook: `Esto es lo que pasa cuando haces ${mTitle.toLowerCase()} como debe hacerse.`,
        context: `${mDesc || 'La clienta llegaba con un resultado que no le encajaba y miedo a volver a intentarlo.'} No necesitaba más color, necesitaba un plan y alguien que supiera ejecutarlo.`,
        solution: `Empecé por un diagnóstico honesto: le dije qué se podía salvar y qué no. Después monté un plan de ${primary.toLowerCase()} respetando la fibra, trabajando por capas finas y controlando tiempos de exposición. Usé ${secondary.toLowerCase()} como soporte y sellé con tratamiento reconstructivo. El proceso tardó horas, pero el resultado fue un color limpio, sano y con brillo real. ${mHint || 'Cada paso tenía un porqué y la clienta lo vio todo.'}`,
        cta: `Si quieres un ${primary.toLowerCase()} como este, reserva tu diagnóstico y lo hacemos a medida.`,
      },
      caption: `✨ ${mTitle}\n\nLa clienta llegaba con un resultado que no le encajaba y miedo a volver a intentarlo. No necesitaba más color, necesitaba un plan.\n\nDiagnóstico honesto, ${primary.toLowerCase()} respetando la fibra, tiempos controlados y tratamiento reconstructivo. Horas de proceso, brillo real al final.\n\nSi quieres un ${primary.toLowerCase()} como este, reserva tu diagnóstico y lo hacemos a medida.\n\n#${tag} #antesydespues #${secondary.replace(/\s/g, '').toLowerCase()} #bravestudio`,
      visual_idea: `Montaje antes → proceso → después, con cortes limpios y música emocional. Muestra el detalle del trabajo durante el proceso.`,
      recording_tip: `Graba clips cortos de cada fase: antes, durante el trabajo (manos, producto, herramienta), y resultado final. Une con cortes al ritmo de la música. El antes y después debe ser el mismo ángulo y misma luz. Vertical 9:16.`,
      day,
    }
  }

  // Fase 4: Comunidad — tendencia, viral, opinion, marca personal
  return {
    type: 'reel',
    title: mTitle,
    service: primary,
    objective,
    category: 'viralidad',
    hookIdea: mHint || `Tu vision del sector`,
    format: 'Reel 35-45s',
    script: {
      hook: `Llevo tiempo pensando en ${mTitle.toLowerCase()} y tengo algo que decir al respecto.`,
      context: `${mDesc || 'El sector está cambiando y a veces da la sensación de que lo importante es otra cosa.'} Se habla mucho de seguidores y poco de oficio, de viralidad y poco de técnica.`,
      solution: `Mi visión es clara: el contenido es la puerta, pero el trabajo es la casa. ${mHint || 'Creo en la honestidad por encima de la tendencia.'} Un reel puede traerte visitas, pero lo que hace que una clienta vuelva es cómo la tratas y cómo trabajas. Por eso sigo apostando por hacer las cosas bien, por formarme, por no saltarme pasos. Y por eso comparto mi día a día: para que se vea que detrás de cada publicación hay horas de oficio real. Esa es mi marca personal y es lo que me diferencia.`,
      cta: `Cuéntame en comentarios qué piensas tú sobre esto, de verdad quiero leerte.`,
    },
    caption: `💭 ${mTitle}\n\nEl sector está cambiando y a veces da la sensación de que lo importante es otra cosa. Se habla de seguidores y poco de oficio.\n\nMi visión: el contenido es la puerta, pero el trabajo es la casa. Un reel trae visitas, lo que hace volver a una clienta es cómo la tratas y cómo trabajas.\n\nCuéntame en comentarios qué piensas tú, de verdad quiero leerte.\n\n#${tag} #opinion #estilista #bravestudio`,
    visual_idea: `Tú en el salón, hablando a cámara de forma reflexiva. Tono íntimo, como si estuvieras pensando en voz alta. Fondo del salón con movimiento suave.`,
    recording_tip: `Plano medio, luz cálida. Tono reflexivo y pausado, no rushes. Empieza con una declaración contundente (3-5s), contextualiza (5-10s), desarrolla tu opinión con calma (20-30s), pregunta a la comunidad (3-5s). Vertical 9:16.`,
    day,
  }
}

export function generateMockMissionContent(input: RetoMissionInput): RetoMissionOutput {
  const services = input.services.length > 0 ? input.services : ['Balayage', 'Color', 'Corte']
  const primary = services[0]
  const day = input.currentDay
  const mTitle = input.missionTitle || `tu próxima publicación`
  const mHint = input.missionPromptHint || ''
  const phase = input.currentPhase
  const mDesc = input.missionDescription || ''

  const item = buildMockItem({ mTitle, mHint, mDesc, primary, services, day, phase, objective: input.objective || 'visibilidad' })

  return {
    item,
    summary: `Reel dedicado a la misión "${mTitle}" · día ${day}.`,
  }
}

export async function generateMissionContent(input: RetoMissionInput): Promise<RetoMissionOutput> {
  try {
    const raw = await generateAIContent(buildMissionPrompt(input))
    const parsed = extractJSON<{ item: Omit<RetoMissionItem, 'day'>; summary: string }>(raw)
    if (
      parsed &&
      parsed.item &&
      parsed.item.type === 'reel' &&
      typeof parsed.item.title === 'string' &&
      typeof parsed.item.service === 'string' &&
      parsed.item.script &&
      typeof parsed.item.script.hook === 'string' &&
      typeof parsed.item.recording_tip === 'string'
    ) {
      const item: RetoMissionItem = {
        ...parsed.item,
        type: 'reel',
        day: input.currentDay,
        objective: parsed.item.objective || input.objective,
        category: parsed.item.category || 'autoridad',
        caption: parsed.item.caption || '',
        visual_idea: parsed.item.visual_idea || '',
        hookIdea: parsed.item.hookIdea || '',
        format: parsed.item.format || 'Reel 35-45s',
      }
      return {
        item,
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Reel generado para tu misión.',
      }
    }
  } catch {
    // fall through to mock
  }
  return generateMockMissionContent(input)
}

// ── Batch: generar varias misiones en una sola llamada IA ─────────────

export function buildMissionBatchPrompt(input: RetoMissionBatchInput): string {
  const services = input.services.length > 0 ? input.services.join(', ') : 'servicios generales de peluquería'
  const daysBlock = input.days.map((d, i) => {
    return `--- DÍA ${d.day} (item ${i + 1} de ${input.days.length}) ---
Misión: ${d.missionTitle}
Descripción: ${d.missionDescription || ''}
Pista: ${d.missionPromptHint || ''}
Fase: ${d.phase} — ${d.phaseTitle}`
  }).join('\n\n')

  const dayNumbers = input.days.map(d => d.day)

  return `Eres un guionista profesional para estilistas en Instagram. Sigues el MANUAL OFICIAL DE GUIONES BRÄVE al pie de la letra.

OBJETIVO DE LA USUARIA: ${input.objective === 'recomendado' ? 'Sin objetivo prioritario — aplicar mix equilibrado entre los 6 pilares' : input.objective}
SERVICIOS ESTRELLA: ${services}
NIVEL: ${input.level}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

=== MANUAL DE GUIONES BRÄVE (OBLIGATORIO) ===

Filosofía: no vendemos servicios, vendemos confianza. No vendemos color, vendemos seguridad.

Todos los reels son de AUTORIDAD (35-45s) con esta estructura INALTERABLE:

1. GANCHO (3-5s): detener el scroll. Claro, directo, basado en dolor / error / falsa creencia / deseo.
   - VÁLIDO: "Si tu rubio dura pocas semanas, algo está fallando."
   - PROHIBIDO: "No vas a creer esto", "El secreto mejor guardado", "Tienes que ver esto".

2. CONTEXTO (5-10s): generar identificación. El problema, el error habitual. NO expliques la solución todavía.

3. SOLUCIÓN (20-30s) — LA PARTE MÁS IMPORTANTE: demostrar autoridad, educar, justificar valor.
   - QUÉ haces, CÓMO lo haces, POR QUÉ lo haces.
   - Debe ser largo, detallado y rico. El proceso vende.

4. CTA (3-5s): conversacional. NUNCA palabras clave ni automatizaciones.
   - VÁLIDO: "Si estás pensando en hacerte este servicio, escríbeme y te ayudo."
   - PROHIBIDO: "Comenta BALAYAGE", "Escribe INFO".

=== REGLA CRÍTICA: NUNCA menciones el reto ===

ESTRICTAMENTE PROHIBIDO en guiones, títulos, captions o cualquier texto que vea la audiencia:
- Mencionar "reto", "reto 10K", "día X", "30 días", "challenge", "plan"
- Cualquier referencia a que la estilista está siguiendo un programa o challenge
- La audiencia NO sabe que existe un reto. El contenido debe verse natural y orgánico.

=== MISIONES A GENERAR ===

Genera EXACTAMENTE ${input.days.length} reels, uno por cada día listado abajo. Cada reel debe estar 100% dedicado a su misión.

${daysBlock}

=== REGLAS DE CATEGORÍA ===
Cada reel debe tener un "category" distinto cuando sea posible, rotando entre: "autoridad", "viralidad", "educacion", "deseo", "dolor", "objecion".

=== ENTREGABLE ===

Devuelve EXACTAMENTE este JSON, sin texto adicional:
{
  "items": [
    {
      "type": "reel",
      "title": "Título atractivo conectado a la misión del día",
      "service": "Servicio al que pertenece",
      "objective": "autoridad" | "reservas" | "visibilidad",
      "category": "autoridad" | "viralidad" | "educacion" | "deseo" | "dolor" | "objecion",
      "hookIdea": "Idea breve de gancho",
      "format": "Reel 35-45s",
      "script": { "hook": "...", "context": "...", "solution": "...", "cta": "..." },
      "caption": "Texto LISTO PARA COPIAR. Varios párrafos separados por \\n\\n. UN SOLO emoji temático al inicio del primer párrafo. Penúltimo párrafo = CTA conversacional. Último párrafo = máx 4 hashtags.",
      "visual_idea": "Cómo grabar (plano, luz, acción, música)",
      "recording_tip": "Recomendación práctica de grabación: plano, duración de cada bloque, luz, música.",
      "day": ${dayNumbers.length > 0 ? dayNumbers[0] : 1}
    }
  ],
  "summary": "Resumen breve"
}

IMPORTANTE: El array "items" debe tener EXACTAMENTE ${input.days.length} elementos, uno por cada día, en el mismo orden. El campo "day" de cada item debe corresponder al día de su misión: ${dayNumbers.join(', ')}.`
}

export function generateMockMissionBatch(input: RetoMissionBatchInput): RetoMissionBatchOutput {
  const services = input.services.length > 0 ? input.services : ['Balayage', 'Color', 'Corte']

  const items: RetoMissionItem[] = input.days.map((d) => {
    const primary = services[d.day % services.length] || services[0]
    return buildMockItem({
      mTitle: d.missionTitle,
      mHint: d.missionPromptHint,
      mDesc: d.missionDescription,
      primary,
      services,
      day: d.day,
      phase: d.phase,
      objective: input.objective || 'visibilidad',
    })
  })

  return {
    items,
    summary: `${items.length} reels generados para ${input.days.length} misiones.`,
  }
}

export async function generateMissionBatch(input: RetoMissionBatchInput): Promise<RetoMissionBatchOutput> {
  try {
    const raw = await generateAIContent(buildMissionBatchPrompt(input))
    const parsed = extractJSON<{ items: Array<Omit<RetoMissionItem, 'day'>>, summary: string }>(raw)
    if (
      parsed &&
      Array.isArray(parsed.items) &&
      parsed.items.length === input.days.length &&
      parsed.items.every(
        (it, i) =>
          it &&
          it.type === 'reel' &&
          typeof it.title === 'string' &&
          typeof it.service === 'string' &&
          it.script &&
          typeof it.script.hook === 'string' &&
          typeof it.script.context === 'string' &&
          typeof it.script.solution === 'string' &&
          typeof it.script.cta === 'string' &&
          typeof it.recording_tip === 'string'
      )
    ) {
      const items: RetoMissionItem[] = parsed.items.map((it, i) => ({
        ...it,
        type: 'reel' as const,
        day: input.days[i].day,
        objective: it.objective || input.objective,
        category: (it.category as RetoCategory) || 'autoridad',
        caption: it.caption || '',
        visual_idea: it.visual_idea || '',
        hookIdea: it.hookIdea || '',
        format: it.format || 'Reel 35-45s',
      }))
      return {
        items,
        summary: typeof parsed.summary === 'string' ? parsed.summary : `${items.length} misiones generadas.`,
      }
    }
  } catch {
    // fall through to mock
  }
  return generateMockMissionBatch(input)
}