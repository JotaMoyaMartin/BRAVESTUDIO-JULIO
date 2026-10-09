/**
 * PRESET · FONDO LIMPIO
 * Mejora visual del entorno: quitar distracciones SIN crear un plató falso
 * por defecto. La persona y el cabello se tocan lo ínfimo (solo luz global).
 */
import { EditInstructions } from '../types'

const BASE_PRESERVE = [
  'la persona, su cabello y su resultado profesional intactos',
  'su pose, ropa y proporciones',
  'la luz y el ángulo original de la foto',
]

const BASE_AVOID = [
  'convertir el entorno en un estudio fotográfico si suave no lo pide',
  'recolocar a la persona o recortarla/pegarla en otra escena',
  'cambiar el color del cabello o retocar su cara',
  'dejar bordes de recorte o residuos del retoque',
]

export function buildBackgroundInstructions(intensity: number): EditInstructions {
  switch (intensity) {
    case 1:
      return {
        goal:
          'Haz una pequeña limpieza del entorno: retira las pequeñas distracciones ' +
          'que se ven tras la persona (una botella, papeles, cables o un maniquí a ' +
          'medio pintar) y nada más. El lugar sigue siendo el mismo, solo algo mejor.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 2:
      return {
        goal:
          'Simplifica el fondo con más decisión: desordena visualmente quitando ' +
          'objetos molestos y elementos que compiten con la persona, igualando ' +
          'superficies y suavizando manchas del entorno. La escena debe seguir ' +
          'siendo creíble, como el mismo local recién arreglado.',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    case 3:
      return {
        goal:
          'Da un acabado premium al conjunto: limpia el fondo, equilibra la luz del ' +
          'entorno y da un aspecto de cámara profesional, pero mantén la coherencia ' +
          'con el lugar real donde se tomó la foto (no construiremos un plató nuevo).',
        preserve: BASE_PRESERVE,
        avoid: BASE_AVOID,
      }
    default:
      return buildBackgroundInstructions(2)
  }
}