import { ContentObjective, serviceLabel } from './reels'
import { generateAIContent, extractJSON } from '../client'

export interface CarouselInput {
  service: string
  objective: ContentObjective
  slideCount: number
  brandContext?: string
  freeText?: string
}

export interface CarouselSlide {
  number: number
  role: string
  text: string
}

export interface CarouselOutput {
  title: string
  slides: CarouselSlide[]
  visualIdea: string
  captionWithHashtags: string
}

const CAROUSEL_PROMPT_STRUCTURES: Record<number, string[]> = {
  3: [
    'Slide 1: Gancho / problema / intriga — capta atención de inmediato',
    'Slide 2: Desarrollo / explicación / valor — da contexto y criterio profesional',
    'Slide 3: Solución + CTA — cierra con la solución y llamada a la acción',
  ],
  4: [
    'Slide 1: Gancho — capta atención en el primer vistazo',
    'Slide 2: Contexto — explica el problema o situación',
    'Slide 3: Solución — da la respuesta profesional',
    'Slide 4: CTA — invita a reservar, escribir o guardar',
  ],
  5: [
    'Slide 1: Gancho — capta atención en el primer vistazo',
    'Slide 2: Contexto — explica la situación o problema',
    'Slide 3: Error / explicación / valor — muestra el error común o aporta el valor diferencial',
    'Slide 4: Solución / resultado — da la solución o muestra el resultado',
    'Slide 5: CTA — invita a reservar, escribir o guardar',
  ],
  6: [
    'Slide 1: Gancho — capta atención en el primer vistazo',
    'Slide 2: Contexto — explica la situación o problema',
    'Slide 3: Error común — muestra el error más repetido',
    'Slide 4: Explicación profesional — da el criterio experto',
    'Slide 5: Solución / resultado — muestra el resultado correcto',
    'Slide 6: CTA — invita a reservar, escribir o guardar',
  ],
}

export function buildCarouselPrompt(input: CarouselInput): string {
  const count = CAROUSEL_PROMPT_STRUCTURES[input.slideCount] ? input.slideCount : 5
  const structure = CAROUSEL_PROMPT_STRUCTURES[count].join('\n')

  return `Eres un experto en contenido para salones de belleza en Instagram. Crea un carrusel siguiendo la metodología BRÄVE.

SERVICIO: ${input.service}
OBJETIVO: ${input.objective}
NÚMERO DE SLIDES: ${count}
${input.freeText ? `IDEA/TEMA: ${input.freeText}` : ''}
${input.brandContext ? `CONTEXTO DEL SALÓN: ${input.brandContext}` : ''}

ESTRUCTURA OBLIGATORIA — CARRUSEL de ${count} slides (NO es un Reel, NO uses GANCHO/CONTEXTO/SOLUCIÓN/CTA):
${structure}

Los textos de cada slide deben ser BREVES, CLAROS y FÁCILES DE LEER. Máximo 30-40 palabras por slide.
Cada slide es una pantalla independiente: frases cortas, directas, impacto visual.

Devuelve EXACTAMENTE este JSON:
{
  "title": "Título atractivo del carrusel",
  "slides": [
    {"number": 1, "role": "Nombre del rol exacto de este slide", "text": "Texto breve del slide"},
    ...
  ],
  "visualIdea": "Idea visual general para el carrusel",
  "captionWithHashtags": "Copy para Instagram + 5 hashtags relevantes"
}`
}

// Building blocks for carousel slides. Each is short and scannable.
function buildSlide(role: string, service: string): { role: string; text: string } {
  const l = serviceLabel(service)
  const blocks: Record<string, string> = {
    Gancho: `Si estás pensando en hacerte ${l.un}, esto te interesa 👇`,
    Contexto: `La mayoría de clientas llegan con la misma duda sobre ${l.el}. Y no es culpa suya: nadie se lo explicó bien.`,
    'Error común': `El error más repetido: pensar que ${l.el} ${l.esFacil} en casa sin ningún cuidado extra. Sin la rutina correcta, el resultado ${l.dura} la mitad.`,
    'Explicación profesional': `En consulta analizo el estado del cabello antes de hacer ${l.el}. Así elijo la técnica y el producto adecuados para cada caso.`,
    'Solución / resultado': `Con el protocolo correcto, ${l.el} luce mejor y ${l.dura} mucho más. Diagnóstico + técnica + mantenimiento en casa.`,
    'Desarrollo / valor': `La clave de ${l.el} está en el diagnóstico previo y en usar el producto adecuado para tu tipo de cabello. No hay fórmulas mágicas, hay criterio.`,
    CTA: `¿Quieres que hablemos de ${l.el}? Escribe ${l.cta} o reserva tu cita. 💌`,
  }
  return { role, text: blocks[role] || `Todo lo que necesitas saber sobre ${l.el}.` }
}

// Real carousel structures by slide count (NOT reel structure).
const CAROUSEL_STRUCTURES: Record<number, string[]> = {
  3: ['Gancho', 'Desarrollo / valor', 'CTA'],
  4: ['Gancho', 'Contexto', 'Solución / resultado', 'CTA'],
  5: ['Gancho', 'Contexto', 'Error común', 'Solución / resultado', 'CTA'],
  6: ['Gancho', 'Contexto', 'Error común', 'Explicación profesional', 'Solución / resultado', 'CTA'],
}

export function getMockCarousel(input: CarouselInput): CarouselOutput {
  const count = CAROUSEL_STRUCTURES[input.slideCount] ? input.slideCount : 5
  const roles = CAROUSEL_STRUCTURES[count]
  const topic = input.freeText?.trim() || input.service

  const slides: CarouselSlide[] = roles.map((role, i) => {
    const built = buildSlide(role, topic)
    return { number: i + 1, role: built.role, text: built.text }
  })

  const l = serviceLabel(topic)
  return {
    title: `${count} cosas que debes saber sobre ${l.el}`,
    slides,
    visualIdea: `Diseño limpio con fondo claro y una frase grande por slide. Mantén el mismo estilo en todas las slides. Puedes usar fotos del proceso o del resultado como fondo difuminado.`,
    captionWithHashtags: `Lo que nadie te cuenta sobre ${l.el} ✨ Guarda este carrusel para cuando lo necesites.\n\n#${topic.replace(/\s/g, '').toLowerCase()} #estilista #salonbelleza #consejoscabello #bellezaprofesional`,
  }
}

/** LLM-backed carousel generation with mock fallback. See generateReel. */
export async function generateCarousel(input: CarouselInput): Promise<CarouselOutput> {
  try {
    const raw = await generateAIContent(buildCarouselPrompt(input))
    const parsed = extractJSON<CarouselOutput>(raw)
    if (
      parsed &&
      typeof parsed.title === 'string' &&
      Array.isArray(parsed.slides) &&
      parsed.slides.length > 0 &&
      parsed.slides.every(
        s => s && typeof s.number === 'number' && typeof s.role === 'string' && typeof s.text === 'string'
      ) &&
      typeof parsed.visualIdea === 'string' &&
      typeof parsed.captionWithHashtags === 'string'
    ) {
      return parsed
    }
  } catch {
    // fall through to mock
  }
  return getMockCarousel(input)
}
