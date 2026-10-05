// NOVEDADES DE LA SEMANA (apartado dentro de Inspiración Reels, petición Jota
// 2-oct-2026): códigos IG de los reels destacados esta semana. Para rotar de
// semana: añade/quita códigos aquí y listo — sin tocar la base de datos.

export const NOVEDADES_CODES = new Set([
  'Da0503gBGq7', // cobrizo viral @yasminahzir
  'Dd6-uBpASXl', // salir del salón @ale_mcseven
  'Ddjb78mqe7S', // blonde maintenance @adrianramoshair
  'DbndrcaNvp5', // suma 130.100€ @semsconcept
  'DauQkNONDwN', // fórmula de color @salvador.ali.official
])

export function isNovedad(item: { instagram_url?: string | null }): boolean {
  const code = item.instagram_url?.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)?.[1]
  return !!code && NOVEDADES_CODES.has(code)
}