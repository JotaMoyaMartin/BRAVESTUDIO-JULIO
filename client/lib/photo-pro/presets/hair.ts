/**
 * PRESET · POTENCIAR CABELLO
 * Preset clave de BRÄVE: trabaja con peluqueras; la foto suele ser el
 * resultado del trabajo de una clienta. Mejorar presencia SIN falsear.
 */
import { EditInstructions } from '../types'

const BASE_PRESERVE = [
  'el color principal exacto del cabello',
  'la técnica visible del trabajo (balayage, mechas, corte, rizado…): misma técnica, no otra',
  'la longitud general del cabello y la fisonomía del rostro',
  'la identidad de la persona, su pose y su ropa',
  'la escena y el fondo salvo un ajuste muy leve de luz',
]

const BASE_AVOID = [
  'cambiar una técnica de color por otra o inventar tonos que no están',
  'convertir un balayage en otro color distinto',
  'que parezca una peluca: el volumen debe crecer hacia donde crece el pelo real',
  'inventar cabello imposible (largos que no existen, entradas tapadas artificialmente)',
  'retocar el rostro o cambiar el fondo (eso lo hace otro modo independiente)',
]

export function buildHairInstructions(intensity: number): EditInstructions {
  switch (intensity) {
    case 1:
      return {
        goal:
          'Mejora mínimamente el acabado del cabello en esta fotografía: da solo un ' +
          'toque muy ligero de cuerpo y ordena pequeños mechones sueltos. La forma ' +
          'y el tamaño del peinado deben seguir siendo prácticamente los mismos.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 2:
      return {
        goal:
          'Dale al cabello más sensación de densidad: levanta un poco las raíces,' +
          ' rellenando ligeramente las zonas que se ven caídas y suaviza el movimiento ' +
          'del peinado. Sigue siendo la misma foto, con el pelo algo más lleno.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 3:
      return {
        goal:
          'Dale al cabello un volumen claramente visible pero natural: más cuerpo, ' +
          'mejor forma en los laterales y movimiento ordenado, sin cambiar el color ' +
          'ni la longitud general. Debe parecer una foto bien peinada del mismo peinado.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 4:
      return {
        goal:
          'Da al cabello un volumen notable y un acabado claramente trabajado, como ' +
          'recién salido del salón: raíces con más aire, contorno definido y brillo ' +
          'sano, sin cruzar la línea del realismo.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 5:
      return {
        goal:
          'Da al cabello el máximo impulso dentro del realismo: volumen considerable ' +
          'y estructura claramente marcada, con acabado de campaña publicitaria, ' +
          'conservando el mismo color, la misma técnica y el mismo rostro.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    default:
      return buildHairInstructions(3)
  }
}