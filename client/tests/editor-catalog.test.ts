// Tests del catálogo de fotos de stock (lib/editor/catalog.ts).
// Regla: todos los src deben existir en /public (el repo no miente).

import { describe, expect, it } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { EDITOR_STOCK_CATEGORIES, EDITOR_STOCK_ITEMS, stockByFilter, stockItemById, STOCK_FILTERS } from '@/lib/editor/catalog'

const PUBLIC = join(__dirname, '..', 'public')

describe('catálogo de fotos de la app', () => {
  it('los ids son únicos', () => {
    const ids = EDITOR_STOCK_ITEMS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada item apunta a un archivo real en /public', () => {
    for (const item of EDITOR_STOCK_ITEMS) {
      expect(item.src.startsWith('/'), `${item.src} debe ser ruta absoluta`).toBe(true)
      const file = join(PUBLIC, item.src.startsWith('/') ? item.src.slice(1) : item.src)
      expect(existsSync(file), `no existe ${file}`).toBe(true)
    }
  })

  it('las categorías referenciadas existen y el id de categoría es válido', () => {
    const catIds = new Set<string>(EDITOR_STOCK_CATEGORIES.map(c => c.id))
    for (const item of EDITOR_STOCK_ITEMS) {
      expect(catIds.has(item.categoryId), `${item.id} → ${item.categoryId} desconocida`).toBe(true)
    }
  })

  it('hay suficiente catálogo para elegir (>= 20 fotos) y el lookup por id cae a undefined', () => {
    expect(EDITOR_STOCK_ITEMS.length).toBeGreaterThanOrEqual(20)
    expect(EDITOR_STOCK_CATEGORIES.length).toBeGreaterThanOrEqual(3)
    expect(stockItemById('desconocido')).toBeUndefined()
    expect(stockItemById(EDITOR_STOCK_ITEMS[0].id)?.id).toBe(EDITOR_STOCK_ITEMS[0].id)
  })
})

describe('filtros del picker (STOCK_FILTERS + stockByFilter — ronda mobile-first)', () => {
  it('STOCK_FILTERS: primero el banco BRÄVE y sus categorías, luego las fotos de la app', () => {
    expect(STOCK_FILTERS.map(f => f.id)).toEqual(['todas', 'brave', 'melenas', 'rubios', 'morenas', 'rizos', 'cuidado', 'herramientas', 'texturas', 'retrato', 'salon', 'detalle'])
    expect(STOCK_FILTERS.every(f => f.name.length > 0)).toBe(true)
  })

  it('las fotos BRÄVE van primero y cada filtro devuelve fotos', () => {
    expect(stockByFilter('todas')).toEqual(EDITOR_STOCK_ITEMS)
    expect(EDITOR_STOCK_ITEMS[0].categoryId).toBe('brave')
    for (const f of STOCK_FILTERS) expect(stockByFilter(f.id).length, `filtro ${f.id}`).toBeGreaterThan(0)
  })

  it('las fotos de la portada (/landing) no salen en el catálogo', () => {
    expect(EDITOR_STOCK_ITEMS.some(i => i.src.startsWith('/landing/'))).toBe(false)
  })

})