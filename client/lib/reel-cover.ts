/**
 * Portadas de reels: algunas filas se guardaron con la ruta de Storage
 * duplicada («…/object/public/storage/v1/object/public/…») y dan 400.
 * Se corrige al pintar, sin tocar la base de datos.
 */
export function reelCoverUrl(url?: string | null): string | null {
  if (!url) return null
  return url.replace(/(\/storage\/v1\/object\/public\/)(?:storage\/v1\/object\/public\/)+/, '$1')
}
