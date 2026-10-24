import { describe, expect, it } from 'vitest'
import { LS_KEYS, diff, emptyMap, findDataUrls, localOnly, mergeRemote, readLocal, replaceStrings, writeLocal, type RecordMap } from '@/lib/team/sync/records'

function storage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => { m.set(k, v) }, map: m }
}

const P1 = { id: 'p1', clientId: 'cl-mayte', week: 1, status: 'borrador', publications: [] }
const T1 = { id: 't1', title: 'Corregir reel', createdAt: '2026-10-20' }

describe('Equipo · leer y escribir lo del navegador', () => {
  it('ida y vuelta sin perder nada', () => {
    const s = storage({
      [LS_KEYS.planning]: JSON.stringify({ p1: P1 }),
      [LS_KEYS.task]: JSON.stringify([T1]),
      [LS_KEYS.notification]: JSON.stringify([{ id: 'n1', createdAt: '2026-10-01' }, { id: 'n2', createdAt: '2026-10-05' }]),
      [LS_KEYS.prod]: JSON.stringify({ tasks: [{ id: 'pt1' }], goals: [{ id: 'g1' }], focusSessions: [], settings: { defaultPreset: 25 } }),
    })
    const m = readLocal(s.get, [{ id: 'cl-mayte', name: 'Mayte' }], [{ id: 'tm-jota' }])
    expect(Object.keys(m.planning)).toEqual(['p1'])
    expect(m['prod-settings']).toEqual({ settings: { defaultPreset: 25 } })
    expect(Object.keys(m.client)).toEqual(['cl-mayte'])
    const out = storage()
    writeLocal(out.set, m, true)
    expect(JSON.parse(out.get(LS_KEYS.planning)!)).toEqual({ p1: P1 })
    expect(JSON.parse(out.get(LS_KEYS.notification)!).map((n: { id: string }) => n.id)).toEqual(['n2', 'n1']) // más nuevas primero
    expect(JSON.parse(out.get(LS_KEYS.prod)!).settings).toEqual({ defaultPreset: 25 })
  })
})

describe('Equipo · qué subir y qué bajar', () => {
  const base = (): RecordMap => { const m = emptyMap(); m.planning.p1 = P1; m.task.t1 = T1; return m }

  it('detecta cambios y borrados locales', () => {
    const prev = base()
    const cur = base()
    cur.planning.p1 = { ...P1, status: 'enviada' }
    delete cur.task.t1
    expect(diff(prev, cur)).toEqual([
      { kind: 'planning', id: 'p1', data: { ...P1, status: 'enviada' } },
      { kind: 'task', id: 't1', deleted: true },
    ])
  })

  it('lo que cambió otra persona entra; lo que estoy tocando no se pisa', () => {
    const snap = base()
    const local = base()
    local.task.t1 = { ...T1, title: 'Lo estoy editando' } // tocado en local
    const merged = mergeRemote(local, snap, [
      { kind: 'planning', id: 'p1', data: { ...P1, status: 'aprobada' }, deleted: false },
      { kind: 'task', id: 't1', data: { ...T1, title: 'Cambio de otra' }, deleted: false },
      { kind: 'task', id: 't2', data: { id: 't2' }, deleted: false },
    ])
    expect((merged.planning.p1 as { status: string }).status).toBe('aprobada')
    expect((merged.task.t1 as { title: string }).title).toBe('Lo estoy editando')
    expect(merged.task.t2).toEqual({ id: 't2' })
  })

  it('un borrado de otra persona quita el elemento si no lo estoy tocando', () => {
    const merged = mergeRemote(base(), base(), [{ kind: 'task', id: 't1', data: {}, deleted: true }])
    expect(merged.task.t1).toBeUndefined()
  })

  it('encuentra lo que solo está en este navegador', () => {
    const local = base()
    local.planning.p9 = { id: 'p9' }
    expect(localOnly(local, [{ kind: 'planning', id: 'p1', data: P1, deleted: false }, { kind: 'task', id: 't1', data: T1, deleted: false }]))
      .toEqual([{ kind: 'planning', id: 'p9', data: { id: 'p9' } }])
  })
})

describe('Equipo · imágenes incrustadas', () => {
  it('las encuentra y las cambia por enlace', () => {
    const img = `data:image/png;base64,${'A'.repeat(300)}`
    const pub = { publications: [{ cover: img, slides: [img, 'https://x/y.jpg'] }] }
    expect([...findDataUrls(pub)]).toEqual([img])
    const out = replaceStrings(pub, new Map([[img, 'https://cdn/a.png']]))
    expect(out).toEqual({ publications: [{ cover: 'https://cdn/a.png', slides: ['https://cdn/a.png', 'https://x/y.jpg'] }] })
  })
})
