/**
 * «EMPEZAR DE NUEVO» (23-oct-2026). Muchas secciones recuerdan lo que
 * estabas haciendo (localStorage). Está bien para no perder trabajo, pero a
 * veces se queda abierto algo a medias y la estilista se pierde.
 * Este botón, arriba en cada sección con pasos, borra SOLO lo de esa sección
 * en este navegador y vuelve a su pantalla inicial. Lo guardado en la cuenta
 * (Biblioteca, Mi plan, Mi Marca) no se toca.
 */

const PREFIX = 'brave_session_'

/** Ruta (primer tramo) → nombre visible y prefijos de estado que se borran. */
export const RESETTABLE: Record<string, { nombre: string; keys: string[] }> = {
  stories: { nombre: 'Stories', keys: ['stories', 'stories-designer', 'story-designer', 'stories-editor'] },
  carrusel: { nombre: 'Carruseles', keys: ['carrusel', 'carruseles'] },
  'crear-contenido': { nombre: 'Crear guiones', keys: ['guiones2'] },
  planificar: { nombre: 'Planificar', keys: ['planificar'] },
  'banco-ganchos': { nombre: 'Banco de ganchos', keys: ['banco-ganchos'] },
  'reto-10k': { nombre: 'Reto 10K', keys: ['reto10k'] },
  estudio: { nombre: 'Estudio de fotos', keys: [] },
  'stories-diseno': { nombre: 'Diseños de stories', keys: [] },
  'editar-videos': { nombre: 'Editar vídeos', keys: [] },
  'inspiracion-reels': { nombre: 'Reels virales', keys: [] },
}

/** Sección de una ruta, si tiene botón de empezar de nuevo. */
export function resettableSection(pathname: string | null): string | null {
  const first = (pathname ?? '').split('/').filter(Boolean)[0] ?? ''
  return first in RESETTABLE ? first : null
}

/** Claves de localStorage de esa sección y usuaria. */
export function keysToClear(allKeys: string[], userId: string, section: string): string[] {
  const conf = RESETTABLE[section]
  if (!conf) return []
  const prefixes = conf.keys.map(k => `${PREFIX}u:${userId}:${k}`)
  // «stories» no debe arrastrar a «stories-diseno»: coincide la clave exacta o seguida de «:».
  return allKeys.filter(k => prefixes.some(p => k === p || k.startsWith(`${p}:`)))
}
