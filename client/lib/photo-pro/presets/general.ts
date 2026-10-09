/**
 * PRESET · MEJORA PRO
 * Combinación moderada: piel natural + cabello algo más favorecido + luz y
 * presentación general. La sensación buscada: "la misma foto, presentada
 * mucho mejor".
 */
import { EditInstructions } from '../types'

const BASE_PRESERVE = [
  'la identidad de la persona, sus rasgos y expresiones',
  'el color principal del cabello y su técnica',
  'la pose, la ropa y el encuadre',
]

const BASE_AVOID = [
  'cambios extremos de luz o contraste',
  'piel plástica (la textura real ha de verse)',
  'cambiar el peinado de fondo, la técnica de color o el color del pelo',
  'retocar el fondo salvo distracciones MUY evidentes',
  'aspecto de foto generada: debe seguir pareciendo la misma foto',
]

export function buildGeneralInstructions(intensity: number): EditInstructions {
  switch (intensity) {
    case 1:
      return {
        goal:
          'Mejora general muy sutil de esta fotografía: una pizca de luz, orden en ' +
          'los tonos y una limpieza minúscula de la piel y el cabello. Todo lo demás ' +
          'idéntico.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 2:
      return {
        goal:
          'Mejora general de esta fotografía con criterio profesional: piel con retoque ' +
          'naturalmente leve, cabello algo más favorecido con mayor cuerpo y brillo ' +
          'sano, luz bien equilibrada y presentación de cámara cuidada. La misma ' +
          'foto, pero mejor hecha.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 3:
      return {
        goal:
          'Presenta esta fotografía con acabado de portada profesional y natural: piel ' +
          'cuidada sin perder textura, cabello con cuerpo y brillo sano, luz cálida ' +
          'y uniforme y fondo apenas limpiado solo si hay distracción evidente. ' +
          'Tiene que seguir siendo ella, en su sitio, con su peinado.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    default:
      return buildGeneralInstructions(2)
  }
}