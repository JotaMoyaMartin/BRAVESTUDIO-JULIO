/**
 * PRESET · ROSTRO NATURAL
 *
 * Objetivo: mejorar la FOTO, no transformar a la persona. La intensidad solo
 * cambia cuánto retoque natural se aplica (menos imperfecciones y algo más
 * de luz), jamás la fisonomía.
 */
import { EditInstructions } from '../types'

const BASE_PRESERVE = [
  'la identidad y los rasgos faciales de la persona',
  'su expresión y la edad aparente',
  'la forma real de nariz, mandíbula, labios y ojos',
  'la pose original de la foto',
  'la ropa y el encuadre',
]

const BASE_AVOID = [
  'adelgazar la nariz o cambiar la mandíbula',
  'aumentar los labios o cambiar los ojos',
  'modificar rasgos que la identifican como ella misma',
  'piel plástica o aspecto de muñeca: la piel debe seguir viéndose real',
  'cambiar el peinado o el maquillaje de fondo de forma notable',
]

export function buildFaceInstructions(intensity: number): EditInstructions {
  switch (intensity) {
    case 1:
      return {
        goal:
          'Retoca esta fotografía de forma casi imperceptible: limpia muy ligeramente ' +
          'pequeñas imperfecciones temporales de la piel (micro-brillos, puntitos muy ' +
          'leves) y equilibra un pelín la luz en el rostro. Todo debe seguir exactamente igual.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 2:
      return {
        goal:
          'Mejora esta fotografía con un retoque natural de mediana intensidad: ' +
          'reduce pequeñas manchas e imperfecciones de la piel, suaviza brillos y ' +
          'sombras duras del rostro y mejora la presentación de la piel ' +
          'manteniendo su textura real (poros y línea de luz visibles).',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 3:
      return {
        goal:
          'Mejora esta fotografía con un retoque profesional pero natural: unifica ' +
          'claramente el tono de piel, retira manchas e imperfecciones, suaviza las ' +
          'sombras duras y ajusta la luz del rostro para que reine. La piel sigue ' +
          'con textura realista y los rasgos idénticos.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    default:
      return buildFaceInstructions(2)
  }
}