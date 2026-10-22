/**
 * DISEÑA TUS STORIES (22-oct-2026): plantillas 9:16 con el mismo motor que
 * Carruseles (ComposedSlide). Texto editable, fotos BRÄVE, foto propia o color.
 * Añadir una plantilla = añadir un objeto aquí.
 */
import type { SlideDesign } from '@/lib/carruseles/composer'
import type { VisualType } from '@/lib/carruseles/types'

export interface StoryTemplateItem {
  text: string
  support?: string
  visual: VisualType
  design: Omit<SlideDesign, 'bg'> & { bg?: SlideDesign['bg'] }
}

export interface StoryTemplate {
  id: string
  name: string
  /** Para qué sirve, en una frase de estilista. */
  hint: string
  stories: StoryTemplateItem[]
}

const base = { scale: 1, overlay: 0.3, tone: 'claro' as const }

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'frase', name: 'Frase con calma', hint: 'Una verdad de salón centrada, con letra manuscrita',
    stories: [
      { text: '**Un** buen corte hace más por tu pelo que diez productos', visual: 'macro_detail', design: { ...base, layout: 'silencio', fontPair: 'silencio-firma', label: 'Verdad nº 1' } },
    ],
  },
  {
    id: 'novedad', name: 'Novedad o servicio', hint: 'Portada tipo revista para presentar algo',
    stories: [
      { text: 'Balayage | Suave', support: 'Raíz difuminada y mantenimiento fácil', visual: 'hero_result', design: { ...base, overlay: 0, layout: 'marco', fontPair: 'poster', note: 'Pregúntame por DM' } },
    ],
  },
  {
    id: 'pregunta', name: 'Pregunta', hint: 'Texto arriba y sitio abajo para el sticker de encuesta',
    stories: [
      { text: '¿Qué te frena a **cambiar de look**?', support: 'Responde aquí abajo ↓', visual: 'lifestyle', design: { ...base, overlay: 0.4, layout: 'arriba', fontPair: 'editorial' } },
    ],
  },
  {
    id: 'opinion', name: 'Opinión de clienta', hint: 'Una frase de una clienta en tarjeta crema',
    stories: [
      { text: '«Por fin un rubio **que no amarillea**»', support: 'Laura, clienta desde 2024', visual: 'hero_result', design: { ...base, overlay: 0.12, layout: 'tarjeta', fontPair: 'revista', label: 'Lo que dicen' } },
    ],
  },
  {
    id: 'huecos', name: 'Huecos libres', hint: 'Avisa de los huecos que te quedan',
    stories: [
      { text: 'Me quedan **3 huecos** esta semana', support: 'Jueves 17:00 · Viernes 10:00 · Sábado 12:30', visual: 'salon_env', design: { ...base, overlay: 0.42, layout: 'revista', fontPair: 'editorial', label: 'Agenda' } },
    ],
  },
  {
    id: 'promo', name: 'Promoción', hint: 'Bloque de color de marca, directo al grano',
    stories: [
      { text: 'Esta semana, tratamiento de brillo **de regalo**', support: 'Con tu servicio de color. Escríbeme «BRILLO»', visual: 'product', design: { ...base, overlay: 0, layout: 'centro', fontPair: 'titular', bg: { kind: 'color', color: '#591427' } } },
    ],
  },
  {
    id: 'secuencia', name: 'Secuencia de 3', hint: 'Verdad, explicación y llamada a la acción',
    stories: [
      { text: '**No** es que tu pelo sea difícil', visual: 'lifestyle', design: { ...base, layout: 'silencio', fontPair: 'silencio-firma', label: 'Verdad nº 2' } },
      { text: 'Es que todavía **no ha tenido** el corte que le corresponde', support: 'Cuando el corte respeta tu caída natural, el pelo se coloca solo.', visual: 'tools', design: { ...base, overlay: 0.34, layout: 'silencio', fontPair: 'silencio' } },
      { text: '**Pide** tu diagnóstico de corte', support: 'Veinte minutos para entender tu pelo antes de cortarlo.', visual: 'macro_detail', design: { ...base, overlay: 0.36, layout: 'silencio', fontPair: 'silencio-firma', note: 'Escríbeme «CORTE»' } },
    ],
  },
]

export function storyTemplate(id: string | null | undefined): StoryTemplate | undefined {
  return STORY_TEMPLATES.find(t => t.id === id)
}
