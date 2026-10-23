/**
 * PORTADAS DE DESTACADAS (23-oct-2026): galería de estilos YA HECHOS.
 * No se genera nada con IA: cada estilo es un diseño fijo (color + icono de
 * línea fina, inicial o foto del banco BRÄVE) que se pinta al momento con
 * los nombres de SUS destacadas y se descarga en 1080×1920.
 * Inspirado en perfiles reales de clientas: una sola paleta por perfil.
 */

export type CoverKind = 'icono' | 'letra' | 'foto'

export interface CoverSet {
  id: string
  nombre: string
  kind: CoverKind
  bg: string
  fg: string
  /** Aro fino interior (estilo monograma). */
  aro?: boolean
  /** Para fotos: blanco y negro. */
  bn?: boolean
}

export const COVER_SETS: CoverSet[] = [
  { id: 'crema-burdeos', nombre: 'Crema y burdeos', kind: 'icono', bg: '#F4EDE4', fg: '#591427' },
  { id: 'burdeos', nombre: 'Burdeos', kind: 'icono', bg: '#591427', fg: '#F6E7A6' },
  { id: 'arena', nombre: 'Arena', kind: 'icono', bg: '#D9CDBE', fg: '#3B2E25' },
  { id: 'dorado', nombre: 'Dorado', kind: 'icono', bg: '#B39A6B', fg: '#FFF7EE' },
  { id: 'noche', nombre: 'Negro y oro', kind: 'icono', bg: '#161214', fg: '#C9A96E' },
  { id: 'monograma', nombre: 'Monograma', kind: 'letra', bg: '#FBF8F3', fg: '#9C8B7A', aro: true },
  { id: 'rose', nombre: 'Rosé', kind: 'letra', bg: '#EADFD8', fg: '#7A1832' },
  { id: 'fotos', nombre: 'Fotos de pelo', kind: 'foto', bg: '#EADFD8', fg: '#FFFFFF' },
  { id: 'fotos-bn', nombre: 'Fotos en blanco y negro', kind: 'foto', bg: '#222', fg: '#FFFFFF', bn: true },
]

export type CoverIcon =
  | 'historia' | 'resenas' | 'resultados' | 'servicios' | 'ubicacion' | 'balayage' | 'rubios' | 'novias'
  | 'alisados' | 'extensiones' | 'canas' | 'color' | 'equipo' | 'formacion' | 'reservar' | 'otro'

const RULES: Array<[RegExp, CoverIcon, string]> = [
  [/historia|con[oó]ceme|sobre m/i, 'historia', '/banco-ia/salon/estilista-manos.jpg'],
  [/rese[ñn]|opini|testimon/i, 'resenas', '/banco-ia/melenas/melena-ondas-caramelo.jpg'],
  [/resultado|antes|cambio|transform/i, 'resultados', '/banco-ia/rubios/rubio-balayage-espalda.jpg'],
  [/servicio|precio|tarifa/i, 'servicios', '/banco-ia/herramientas/tijera-en-mano.jpg'],
  [/ubicaci|d[oó]nde|llegar|sal[oó]n/i, 'ubicacion', '/banco-ia/salon/espejo-luz.jpg'],
  [/balayage|mechas/i, 'balayage', '/banco-ia/rubios/rubio-mano-ondas.jpg'],
  [/rubio/i, 'rubios', '/banco-ia/rubios/rubio-ceniza-liso.jpg'],
  [/novia|recogido|peinado|invitada/i, 'novias', '/banco-ia/rubios/rubio-nuca-recogido.jpg'],
  [/alisad|keratina/i, 'alisados', '/banco-ia/morenas/morena-lisa-brillo.jpg'],
  [/extensi/i, 'extensiones', '/banco-ia/melenas/melena-espalda-larga.jpg'],
  [/cana/i, 'canas', '/banco-ia/canas/canas-melena.jpg'],
  [/color|tinte/i, 'color', '/banco-ia/herramientas/bol-tinte.jpg'],
  [/equipo/i, 'equipo', '/banco-ia/salon/sillon-vacio.jpg'],
  [/formaci|curso/i, 'formacion', '/banco-ia/herramientas/peines-madera.jpg'],
  [/reserv|cita/i, 'reservar', '/banco-ia/herramientas/secador.jpg'],
]
const FALLBACK_PHOTOS = [
  '/banco-ia/texturas/textura-ondas-macro.jpg',
  '/banco-ia/texturas/mechon-s-beige.jpg',
  '/banco-ia/melenas/melena-movimiento.jpg',
]

export function coverIcon(nombre: string): CoverIcon {
  return RULES.find(([re]) => re.test(nombre))?.[1] ?? 'otro'
}

/** Foto del banco BRÄVE para una destacada (sin repetir dentro del set). */
export function coverPhotos(nombres: string[]): string[] {
  const used = new Set<string>()
  let fb = 0
  return nombres.map(n => {
    const hit = RULES.find(([re]) => re.test(n))?.[2]
    if (hit && !used.has(hit)) { used.add(hit); return hit }
    const f = FALLBACK_PHOTOS[fb++ % FALLBACK_PHOTOS.length]
    used.add(f)
    return f
  })
}

/** Nombre de archivo de cada portada. */
export const coverFileName = (setId: string, nombre: string, i: number) =>
  `portada-${String(i + 1).padStart(2, '0')}-${nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${setId}.png`
