/**
 * REGISTRO DE PRESETS — FOTO PRO (Retoque Pro).
 *
 * Única fuente de verdad de: modos disponibles, opciones de intensidad con su
 * microcopy y las instrucciones de edición (qué mejorar / qué conservar /
 * qué prohibir). El FORMATO del prompt lo pone el adapter del proveedor.
 * Nada de prompts escritos sueltos en componentes.
 */
import { PhotoMode, EditInstructions } from '../types'
import { buildFaceInstructions } from './face'
import { buildHairInstructions } from './hair'
import { buildBackgroundInstructions } from './background'
import { buildGeneralInstructions } from './general'

export interface IntensityOption {
  value: number
  label: string
  microcopy: string
}

export interface ModeMeta {
  id: PhotoMode
  label: string
  desc: string
  /** Fases de confirmación (qué se conservará). */
  willKeep: string[]
  /** Texto del estado "procesando", según modo. */
  processingCopy: string
  intensities: IntensityOption[]
  build: (intensity: number) => EditInstructions
}

export const MODE_META: Record<PhotoMode, ModeMeta> = {
  face: {
    id: 'face',
    label: 'Rostro natural',
    desc: 'Suaviza piel y pequeñas imperfecciones manteniendo los rasgos.',
    willKeep: ['su identidad y rasgos', 'su expresión y edad aparente', 'la pose, ropa y encuadre'],
    processingCopy: 'Mejorando la piel de forma natural…',
    intensities: [
      { value: 1, label: 'Natural', microcopy: 'Retoque casi imperceptible' },
      { value: 2, label: 'Media', microcopy: 'Menos imperfecciones, más luz' },
      { value: 3, label: 'Alta', microcopy: 'Acabado de estudio, sin perder tu piel real' },
    ],
    build: buildFaceInstructions,
  },
  hair: {
    id: 'hair',
    label: 'Potenciar cabello',
    desc: 'Da más cuerpo, presencia y volumen al cabello.',
    willKeep: [
      'el color principal del cabello',
      'la técnica visible (balayage, mechas, corte…)',
      'su rostro, pose y ropa',
    ],
    processingCopy: 'Potenciando el cabello sin perder el resultado original…',
    intensities: [
      { value: 1, label: 'Sutil', microcopy: 'Muy natural' },
      { value: 2, label: 'Ligero', microcopy: 'Más densidad' },
      { value: 3, label: 'Medio', microcopy: 'Más cuerpo y presencia' },
      { value: 4, label: 'Notable', microcopy: 'Acabado de salón marcado' },
      { value: 5, label: 'Máximo', microcopy: 'Más impactante' },
    ],
    build: buildHairInstructions,
  },
  background: {
    id: 'background',
    label: 'Fondo limpio',
    desc: 'Reduce distracciones y consigue una imagen más limpia.',
    willKeep: ['a la persona y su cabello intactos', 'la pose y la ropa', 'el mismo lugar real'],
    processingCopy: 'Limpiando visualmente el entorno…',
    intensities: [
      { value: 1, label: 'Suave', microcopy: 'Pequeña limpieza' },
      { value: 2, label: 'Limpio', microcopy: 'Sin elementos molestos' },
      { value: 3, label: 'Premium', microcopy: 'Acabado de salón profesional' },
    ],
    build: buildBackgroundInstructions,
  },
  general: {
    id: 'general',
    label: 'Mejora pro',
    desc: 'Mejora general y sutil para una fotografía más profesional.',
    willKeep: ['su identidad y rasgos', 'el color y técnica del cabello', 'la pose, ropa y encuadre'],
    processingCopy: 'Presentando tu foto como profesional…',
    intensities: [
      { value: 1, label: 'Natural', microcopy: 'La misma foto, un pelín mejor' },
      { value: 2, label: 'Pro', microcopy: 'Luz, piel y cabello equilibrados' },
      { value: 3, label: 'Premium', microcopy: 'Acabado de portada' },
    ],
    build: buildGeneralInstructions,
  },
}

export const INTENSITY_LIMIT: Record<PhotoMode, { min: number; max: number }> = {
  face: { min: 1, max: 3 },
  hair: { min: 1, max: 5 },
  background: { min: 1, max: 3 },
  general: { min: 1, max: 3 },
}

/** Fábrica del engine: modo + intensidad → instrucciones. */
export function buildInstructions(mode: PhotoMode, intensity: number): EditInstructions {
  const meta = MODE_META[mode]
  if (!meta) throw new Error(`Presets: modo desconocido "${mode}"`)
  const lim = INTENSITY_LIMIT[mode]
  const clamped = Math.min(lim.max, Math.max(lim.min, Math.round(intensity)))
  return meta.build(clamped)
}