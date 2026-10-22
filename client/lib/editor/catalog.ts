// Catálogo de fotos de stock DE LA APP para los editores (petición Jota).
// MVP estático: seed con las 21 fotos ya presentes en client/public/
// (13 de foto-inspo + 8 de landing). Sin API keys, sin red: funciona en demo.
// El catálogo se alimenta con el flujo ya usado para tiles/foto-inspo:
// foto → `sips -s format jpeg -Z 1100` → `client/public/stock/<slug>.jpg` → entrada aquí.

import { EditorPhotoItem } from './types'
import { BANCO_CATEGORIES, BANCO_PHOTOS } from '../banco-ia'

export type { EditorPhotoItem } from './types'

export type StockCategoryId = 'retrato' | 'en-el-puesto' | 'color' | 'salon' | 'brave'

export interface StockCategory {
  id: StockCategoryId
  name: string
}

export const EDITOR_STOCK_CATEGORIES: StockCategory[] = [
  { id: 'retrato', name: 'Retratos' },
  { id: 'en-el-puesto', name: 'En el puesto' },
  { id: 'color', name: 'Color y técnica' },
  { id: 'salon', name: 'El salón' },
  { id: 'brave', name: 'Fotos BRÄVE' },
]

/** Banco BRÄVE (fotos IA minimalistas, lib/banco-ia.ts): van primero. */
const BANCO_ITEMS: EditorPhotoItem[] = BANCO_PHOTOS.map((p, i) => ({
  id: p.id,
  categoryId: 'brave',
  src: p.src,
  title: `${BANCO_CATEGORIES.find(c => c.id === p.category)?.name ?? 'Foto'} ${i + 1}`,
  tags: [p.category],
}))

const APP_ITEMS: EditorPhotoItem[] = [
  // ── Retratos ─────────────────────────────────────────────────
  { id: 'selfie-espejo-look', categoryId: 'retrato', src: '/foto-inspo/selfie-espejo-look.jpg', title: 'Espejo con tu look' },
  { id: 'selfie-bien-del-dia', categoryId: 'retrato', src: '/foto-inspo/selfie-bien-del-dia.jpg', title: 'Cara amable al fondo del salón' },
  { id: 'detalle-tarjeta', categoryId: 'retrato', src: '/foto-inspo/detalle-tarjeta.jpg', title: 'Tarjeta de presentación' },
  { id: 'pose-secador-bn', categoryId: 'retrato', src: '/foto-inspo/pose-secador-bn.jpg', title: 'Retrato B/N con secador' },
  { id: 'pose-brazos-cruzados', categoryId: 'retrato', src: '/foto-inspo/pose-brazos-cruzados.jpg', title: 'Brazos cruzados a cámara' },
  { id: 'outfit-espejo', categoryId: 'retrato', src: '/foto-inspo/selfie-faena-outfit.jpg', title: 'Outfit completo en el espejo' },

  // ── En el puesto ─────────────────────────────────────────────
  { id: 'selfie-en-plena-faena', categoryId: 'en-el-puesto', src: '/foto-inspo/selfie-en-plena-faena.jpg', title: 'Selfie en plena faena' },
  { id: 'pose-plancha', categoryId: 'en-el-puesto', src: '/foto-inspo/pose-plancha.jpg', title: 'Plancha al aire' },
  { id: 'tijeras-al-aire', categoryId: 'en-el-puesto', src: '/foto-inspo/tijeras-al-aire.jpg', title: 'Tijeras al aire', tags: ['detalle'] },
  { id: 'detalle-tijeras-camara', categoryId: 'en-el-puesto', src: '/foto-inspo/detalle-tijeras-camara.jpg', title: 'Tijeras hacia cámara', tags: ['detalle'] },
  { id: 'pose-herramientas-brazos', categoryId: 'en-el-puesto', src: '/foto-inspo/pose-herramientas-brazos.jpg', title: 'Herramientas en brazos', tags: ['detalle'] },
  { id: 'pose-taburete-tijeras', categoryId: 'en-el-puesto', src: '/foto-inspo/pose-taburete-tijeras.jpg', title: 'Taburete con tijeras' },


  // ── El salón ─────────────────────────────────────────────────
  { id: 'pose-sillon-trabajo', categoryId: 'salon', src: '/foto-inspo/pose-sillon-trabajo.jpg', title: 'Sillón de trabajo' },
]

export const EDITOR_STOCK_ITEMS: EditorPhotoItem[] = [...BANCO_ITEMS, ...APP_ITEMS]

// ── Filtros del picker (rediseño LAB mobile: cards 4:5 + más contraste) ─────
// 'En el salón' agrega las categorías en-el-puesto + salon; Resultados y
// Detalles derivan de tags transversales (no recategorizamos items).

export type StockFilterId = 'todas' | 'brave' | 'melenas' | 'texturas' | 'rubios' | 'morenas' | 'rizos' | 'cuidado' | 'herramientas' | 'retrato' | 'salon' | 'color' | 'resultado' | 'detalle'

export const STOCK_FILTERS: { id: StockFilterId; name: string }[] = [
  { id: 'todas', name: 'Todas' },
  { id: 'brave', name: 'Fotos BRÄVE' },
  { id: 'melenas', name: 'Melenas' },
  { id: 'rubios', name: 'Rubios' },
  { id: 'morenas', name: 'Morenas y castaños' },
  { id: 'rizos', name: 'Rizos y canas' },
  { id: 'cuidado', name: 'Cuidado y producto' },
  { id: 'herramientas', name: 'Herramientas' },
  { id: 'texturas', name: 'Texturas' },
  { id: 'retrato', name: 'Retratos' },
  { id: 'salon', name: 'En el salón' },
  { id: 'detalle', name: 'Detalles' },
]

export function stockByFilter(id: StockFilterId): EditorPhotoItem[] {
  if (id === 'todas') return EDITOR_STOCK_ITEMS
  const banco = (...cats: string[]) => BANCO_ITEMS.filter(i => cats.some(c => i.tags?.includes(c)))
  if (id === 'brave') return BANCO_ITEMS
  if (id === 'melenas') return banco('melenas')
  if (id === 'texturas') return banco('texturas', 'detalle')
  if (id === 'rubios') return banco('rubios')
  if (id === 'morenas') return banco('morenas', 'castanos')
  if (id === 'rizos') return banco('rizos', 'canas')
  if (id === 'cuidado') return banco('tratamientos', 'producto')
  if (id === 'herramientas') return banco('herramientas')
  if (id === 'resultado') return EDITOR_STOCK_ITEMS.filter(i => i.tags?.includes('resultado'))
  if (id === 'detalle') return EDITOR_STOCK_ITEMS.filter(i => i.tags?.includes('detalle'))
  if (id === 'salon') return [...banco('salon'), ...APP_ITEMS.filter(i => i.categoryId === 'en-el-puesto' || i.categoryId === 'salon')]
  return EDITOR_STOCK_ITEMS.filter(i => i.categoryId === id)
}

/** Ids únicos — el editor usa id como key de React y para re-selección. */
export function stockItemById(id: string): EditorPhotoItem | undefined {
  return EDITOR_STOCK_ITEMS.find(it => it.id === id)
}