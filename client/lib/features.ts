/**
 * Interruptores de secciones (23-oct-2026).
 *
 * INSTAGRAM (conexión + Análisis de perfil): hecho y probado con una cuenta
 * real, pero OCULTO hasta que Meta apruebe la app (App Review). Para mostrarlo:
 * NEXT_PUBLIC_SHOW_INSTAGRAM=1 en Vercel y volver a publicar. Mientras está
 * oculto, /analisis sigue funcionando por URL directa (para pruebas).
 */
export function showInstagram(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_INSTAGRAM === '1'
}
