/**
 * CARRUSELES LISTOS (28-oct-2026): textos de salón ya escritos para el camino
 * «Elige un diseño» (sin IA, al momento). Por defecto en Silencio de Autor, el
 * estilo favorito de Jota. Se editan igual que un carrusel hecho con IA.
 *
 * Reglas: verdades de salón concretas, nada de resultados garantizados.
 * **palabra** = letra manuscrita (primera palabra del titular en Silencio).
 */
import type { CopySlide, VisualType } from './types'

export interface ReadyCarousel {
  id: string
  name: string
  /** Para qué sirve, en una frase de estilista. */
  hint: string
  service: string
  styleId: string
  slides: CopySlide[]
  caption: string
}

type SlideInput = Omit<CopySlide, 'n'>
const s = (role: CopySlide['role'], text: string, visual: VisualType, support?: string): SlideInput =>
  ({ role, text, visual, ...(support ? { support } : {}) })
/** Numera las slides (n empieza en 1). */
const num = (list: SlideInput[]): CopySlide[] => list.map((x, i) => ({ ...x, n: i + 1 }) as CopySlide)

export const READY_CAROUSELS: ReadyCarousel[] = [
  {
    id: 'rubio-amarillo', name: 'Por qué tu rubio amarillea', hint: 'Educa y atrae a clientas de rubio', service: 'Rubios', styleId: 'silencio-autor',
    slides: num([
      s('hook', '**No** es tu rubio, es lo que pasa después', 'macro_detail', 'Por qué amarillea en pocas semanas'),
      s('desarrollo', '**El** agua de tu casa también tiñe', 'lifestyle', 'La cal y los minerales apagan el tono poco a poco.'),
      s('desarrollo', '**El** calor sin protector lo oxida', 'tools', 'Plancha y secador a tope abren la fibra y el color se va.'),
      s('desarrollo', '**Un** matizador no es para todos los días', 'product', 'Usado de más, apaga y oscurece el rubio.'),
      s('cta', '**Tu** rubio merece un plan, no un parche', 'hero_result', 'Escríbeme y vemos qué necesita el tuyo'),
    ]),
    caption: 'El rubio no se estropea en el salón: se cuida (o no) en casa. Guarda este carrusel y escríbeme si quieres que revisemos el tuyo.',
  },
  {
    id: 'balayage-mantenimiento', name: 'Cada cuánto retocar el balayage', hint: 'Resuelve la duda que más te hacen', service: 'Balayage', styleId: 'silencio-autor',
    slides: num([
      s('hook', '**Tu** balayage no necesita ir cada mes', 'hero_result', 'Esa es justo su gracia'),
      s('desarrollo', '**Crece** sin marcar raíz', 'macro_detail', 'Por eso aguanta bien entre 3 y 4 meses, según tu pelo.'),
      s('desarrollo', '**Lo** que sí conviene: un matiz', 'product', 'A mitad de camino, para recuperar el brillo y el tono.'),
      s('desarrollo', '**En** casa, champú sin sulfatos', 'lifestyle', 'Y protector de calor siempre que uses herramientas.'),
      s('cta', '**Pregúntame** cuándo te toca a ti', 'hands_process', 'Cada melena tiene su ritmo'),
    ]),
    caption: '¿Cada cuánto hay que retocar un balayage? Menos de lo que crees. Escríbeme y te digo cuándo te toca a ti.',
  },
  {
    id: 'canas-naturales', name: 'Canas sin raíz marcada', hint: 'Para clientas cansadas de teñir cada 3 semanas', service: 'Canas', styleId: 'silencio-autor',
    slides: num([
      s('hook', '**Cubrir** canas no es tu única opción', 'lifestyle', 'Hay formas de que no se note la raíz'),
      s('desarrollo', '**Fundir** en lugar de tapar', 'macro_detail', 'Mechas finas que mezclan las canas con tu color.'),
      s('desarrollo', '**Menos** visitas, menos marca', 'salon_env', 'Al crecer, la línea entre raíz y color se ve mucho menos.'),
      s('desarrollo', '**No** sirve igual para todas', 'hands_process', 'Depende de cuántas canas tengas y de tu tono de base.'),
      s('cta', '**Hablemos** de tu caso', 'hero_result', 'Te digo qué opción te encaja'),
    ]),
    caption: 'Teñir cada tres semanas no es la única salida. Escríbeme y vemos si fundir tus canas encaja contigo.',
  },
  {
    id: 'cuidado-casa', name: '3 errores en casa', hint: 'Valor rápido que la gente guarda', service: 'Cuidado capilar', styleId: 'silencio-autor',
    slides: num([
      s('hook', '**Tres** errores que estropean tu melena', 'lifestyle', 'Y los haces sin darte cuenta'),
      s('desarrollo', '**Frotar** con la toalla', 'product', 'Mejor presionar suave: frotar rompe la cutícula.'),
      s('desarrollo', '**Peinar** de raíz a puntas', 'tools', 'Empieza por las puntas y sube poco a poco.'),
      s('desarrollo', '**Dormir** con el pelo mojado', 'macro_detail', 'El pelo húmedo es más frágil y se parte con el roce.'),
      s('cta', '**Guárdalo** para no olvidarlo', 'hero_result', 'Y compártelo con quien lo necesite'),
    ]),
    caption: 'Pequeños gestos que cambian mucho tu melena. Guarda este carrusel y cuéntame cuál de los tres hacías.',
  },
  {
    id: 'corte-sanear', name: 'Sanear no es perder largo', hint: 'Para quien teme cortarse', service: 'Corte', styleId: 'silencio-autor',
    slides: num([
      s('hook', '**Sanear** no es perder tu largo', 'hands_process', 'Es lo que hace que crezca bonito'),
      s('desarrollo', '**Las** puntas abiertas suben', 'macro_detail', 'Si no se cortan, la rotura avanza hacia arriba.'),
      s('desarrollo', '**Un** dedo a tiempo', 'tools', 'Ahorra tener que cortar cinco más adelante.'),
      s('desarrollo', '**Más** cuerpo en las puntas', 'lifestyle', 'Una melena sana parece más densa aunque mida igual.'),
      s('cta', '**Tu** largo, cuidado', 'hero_result', 'Reserva y lo saneamos juntas'),
    ]),
    caption: 'Cortar un poco a tiempo es la mejor forma de no perder tu largo. Reserva tu cita y lo vemos juntas.',
  },
  {
    id: 'diagnostico', name: 'Antes de cambiar de color', hint: 'Posiciona tu diagnóstico como especialista', service: 'Color', styleId: 'silencio-autor',
    slides: num([
      s('hook', '**Antes** de cambiar, te miro el pelo', 'hands_process', 'Por qué empiezo siempre con un diagnóstico'),
      s('desarrollo', '**Tu** historial importa', 'macro_detail', 'Tintes, mechas o alisados anteriores cambian el proceso.'),
      s('desarrollo', '**Tu** piel también decide', 'lifestyle', 'El mismo tono no favorece igual a todas.'),
      s('desarrollo', '**Y** tu rutina', 'product', 'Un color que no puedes mantener no es para ti.'),
      s('cta', '**Pide** tu diagnóstico', 'hero_result', 'Y sales sabiendo qué te va bien'),
    ]),
    caption: 'Un buen color empieza mucho antes del tinte. Escríbeme y reservamos tu diagnóstico.',
  },
]

export function readyCarousel(id: string | null | undefined): ReadyCarousel | null {
  return READY_CAROUSELS.find(c => c.id === id) ?? null
}
