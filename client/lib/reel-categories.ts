// CATEGORÍAS de Inspiración Reels (2-oct-2026) — pocas y fáciles de entender.
// Aún SIN columna en la base de datos: la categoría se deriva del instagram_url
// (código del reel). Cuando se migre una columna `category` real (ver
// supabase/migrations — aplicar con Supabase), el campo de la BD mandará y las
// filas nuevas creadas desde el Panel Admin podrán traer su propia categoría.

export type ReelCategory =
  | 'color'      // Color & Balayage
  | 'cortes'     // Cortes y forma de rostro
  | 'clientas'   // Clientas reales (testimonial, mensajes)
  | 'productos'  // Productos y criterio profesional
  | 'salon'      // El salón (equipo, humor, ambiente)
  | 'mitos'      // Mitos y dudas (educación viral)
  | 'ventas'     // Precios y dinero (cifras, "cuánto suma")
  | 'gesto'      // Transición de un gesto
  | 'objeto'     // Transición con un objeto
  | 'camara'     // Transición con cámara fija / edición
  | 'otros'

export const INSPIRACION_CATEGORY_ORDER: ReelCategory[] = ['color', 'cortes', 'clientas', 'productos', 'salon', 'mitos', 'ventas']
export const TRANSICION_CATEGORY_ORDER: ReelCategory[] = ['gesto', 'objeto', 'camara']

export const CATEGORY_LABELS: Record<ReelCategory, string> = {
  color: 'Color & Balayage',
  cortes: 'Cortes',
  clientas: 'Clientas reales',
  productos: 'Productos',
  salon: 'El salón',
  mitos: 'Mitos y dudas',
  ventas: 'Precios y dinero',
  gesto: 'De un gesto',
  objeto: 'Con un objeto',
  camara: 'Cámara fija',
  otros: 'Otros',
}

export function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat as ReelCategory] || CATEGORY_LABELS.otros
}

/** Código corto del reel desde cualquier formato de URL de IG. */
export function codeFromUrl(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)
  return m ? m[2] : null
}

// Curación por código de reel (las 27 filas activas de producción, 2-oct-2026).
const BY_CODE: Record<string, ReelCategory> = {
  // Inspiraciones
  'DXuTaLKiL0P': 'color',     // balayage proceso @jessicas_hairsalon
  'DWR4xpGijRK': 'color',     // expensive brunette @lucasdioslo
  'DXP5G_Dj4I-': 'color',     // antes-durante-después color @studioleosilva
  'DXNrKxkDBN_': 'cortes',    // cortes por rostro parte 1 @frankleshair
  'Daf-AHWxY9B': 'cortes',    // rostro ovalado @ladyferreira___
  'DVn4uEWjDqp': 'clientas',  // clienta prueba el salón @juliacandela_
  'DVeHjLHETsY': 'clientas',  // mensajes clientas @lvglamstudio
  'DUoxAFYEmGS': 'productos', // ranking de productos @palmabypalomino
  'DZdb912BJUK': 'productos', // línea Keune Care @dununesoficial
  'DVBElfajeHR': 'salon',     // carteles @glam.a.salon
  'DXaOlXOjRD6': 'salon',     // equipo con humor @onetouchmiami
  'DQbreq8DNRm': 'mitos',     // mitos y verdades @akabasalon
  // Novedades (2 oct 2026)
  'Da0503gBGq7': 'color',     // cobrizo viral @yasminahzir (37K likes)
  'Dd6-uBpASXl': 'clientas',  // salir del salón @ale_mcseven
  'Ddjb78mqe7S': 'color',     // blonde maintenance @adrianramoshair
  'DbndrcaNvp5': 'ventas',    // suma 130.100€ @semsconcept
  'DauQkNONDwN': 'color',     // fórmula de color @salvador.ali.official
  // Transiciones
  'DWXFDAAjAtE': 'gesto',     // cruzando por delante @tylerjadehair
  'CxWBJX_PFx5': 'gesto',     // tirón de pelo @_taliascott
  'DS7adQMEd7M': 'gesto',     // brazos en X @seanmichaelhair
  'Csk2_MkImWm': 'gesto',     // movimiento de mano @anamdarbar97
  'DK-H0HkMLxj': 'gesto',     // flip @vanessa.tamkan
  'DKf4G3dyCDK': 'gesto',     // bajando cabeza @realericvaughn
  'DUq6nLVgNp5': 'gesto',     // cuello @mariaraquelps
  'DXuivNlgc7o': 'gesto',     // puño @shay.sullivann
  'DYNUGUSIshc': 'gesto',     // gesto de brazo @bibihairdresser
  'DYNtH9kg0Ss': 'gesto',     // billie jean @hairbythay
  'DaBe1VoPXXW': 'gesto',     // dulce de leche @adrianohairstylist
  'C2-S5_KOI_v': 'objeto',    // chaqueta @thanuska.s
  'DR51Bz7jX_d': 'objeto',    // puerta @vickylauren
  'DUg2MZlEd6b': 'camara',    // clon @alvabeautysalon
  'DVRVWOPiL5Z': 'camara',    // clásica @celineconcept_
}

/** Categoría de un reel: el campo real (`category`) si existe; si no, el mapa. */
export function reelCategory(item: { instagram_url?: string | null; category?: string | null }): ReelCategory {
  if (item.category) return CATEGORY_LABELS[item.category as ReelCategory] ? (item.category as ReelCategory) : 'otros'
  const code = codeFromUrl(item.instagram_url)
  return (code && BY_CODE[code]) || 'otros'
}