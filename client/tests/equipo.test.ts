import { describe, expect, it } from 'vitest'
import { groupByWeek, materialPath, monthBounds, weekStart, type Publicacion } from '@/lib/equipo/types'

const pub = (id: string, fecha: string): Publicacion => ({ id, user_id: 'u', fecha, tipo: 'reel', titulo: id, nota: null, estado: 'preparando' })

describe('Clientes del servicio · calendario', () => {
  it('la semana empieza en lunes', () => {
    expect(weekStart('2026-10-24')).toBe('2026-10-19') // sábado → lunes 19
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
    expect(weekStart('2026-10-25')).toBe('2026-10-19') // domingo
  })
  it('agrupa por semanas en orden', () => {
    const g = groupByWeek([pub('c', '2026-10-28'), pub('a', '2026-10-20'), pub('b', '2026-10-22')])
    expect(g.map(w => w.week)).toEqual(['2026-10-19', '2026-10-26'])
    expect(g[0].items.map(p => p.id)).toEqual(['a', 'b'])
  })
  it('límites del mes', () => {
    expect(monthBounds(new Date(2026, 1, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('Clientes del servicio · material', () => {
  it('ruta segura dentro de la carpeta de la clienta', () => {
    expect(materialPath('abc', 'b1', 'Balayage Marta (1).MOV')).toBe('u/abc/b1/Balayage-Marta-1-.MOV')
    expect(materialPath('abc', 'b1', '../../../etc/passwd')).toBe('u/abc/b1/..-..-..-etc-passwd')
    expect(materialPath('abc', 'b1', 'Peluquería ñ.jpg')).toBe('u/abc/b1/Peluqueria-n.jpg')
  })
})
