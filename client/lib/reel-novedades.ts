// NOVEDADES DE LA SEMANA (apartado dentro de Inspiración Reels, petición Jota
// 2-oct-2026): códigos IG de los reels destacados esta semana. Para rotar de
// semana: añade/quita códigos aquí y listo — sin tocar la base de datos.

export const NOVEDADES_CODES = new Set([
  // 21-oct-2026: carpeta «Trend salones»
  'DeSS5zeJRmT', // @tayloratartistry
  'Ded-x9HtU5h', // @nina.theclub
  'Ddbp7iwgQJW', // @rosse_tattoostudio
  'Dd9m0oJB0yX', // @balayage.blonde
  'DdRvUSoTqfR', // @aliciaramirezhair
  'DdE3-OroCcI', // @eeia.studio
  'DbV0W7-k7Cg', // @abdelamranioficial
])

export function isNovedad(item: { instagram_url?: string | null }): boolean {
  const code = item.instagram_url?.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)?.[1]
  return !!code && NOVEDADES_CODES.has(code)
}