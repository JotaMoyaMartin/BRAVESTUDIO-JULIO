import { describe, expect, it } from 'vitest'
import { diffMembers, graceUntil, isEmail, normalizeEmail, parseSkoolCsv, GRACE_DAYS } from '@/lib/skool/members'
import { hasActiveAccess } from '@/lib/access'

describe('Lista de Skool · leer el archivo', () => {
  it('lee la exportación con cabecera, comillas y emails en mayúsculas', () => {
    const csv = 'FirstName,LastName,Email,Joined\n"Laura","Gómez","Laura@Mail.com","2026-01-02"\nAna,Ruiz,ana@mail.com,2026-02-03\nPepa,,no-es-email,2026\nAna,Ruiz,ANA@mail.com,2026-02-03\n'
    const { rows, invalid } = parseSkoolCsv(csv)
    expect(rows).toEqual([{ email: 'laura@mail.com', name: 'Laura Gómez' }, { email: 'ana@mail.com', name: 'Ana Ruiz' }])
    expect(invalid).toBe(1)
  })
  it('acepta punto y coma y cabecera en español', () => {
    const { rows } = parseSkoolCsv('Nombre;Correo electrónico\nMarta;marta@x.es\n')
    expect(rows).toEqual([{ email: 'marta@x.es', name: 'Marta' }])
  })
  it('acepta una lista de emails sin cabecera', () => {
    expect(parseSkoolCsv('a@x.es\nb@x.es\n').rows.map(r => r.email)).toEqual(['a@x.es', 'b@x.es'])
  })
  it('normaliza y valida emails', () => {
    expect(normalizeEmail('  Hola@Mail.COM ')).toBe('hola@mail.com')
    expect(isEmail('hola@mail.com')).toBe(true)
    expect(isEmail('hola@mail')).toBe(false)
  })
})

describe('Lista de Skool · altas y bajas', () => {
  it('calcula quién entra, quién sigue y quién sale', () => {
    const d = diffMembers(['a@x.es', 'b@x.es', 'c@x.es'], ['b@x.es', 'c@x.es', 'd@x.es'])
    expect(d).toEqual({ nuevas: ['a@x.es'], siguen: ['b@x.es', 'c@x.es'], bajas: ['d@x.es'], sospechosa: false })
  })
  it('avisa si la lista nueva es sospechosamente corta', () => {
    const before = Array.from({ length: 50 }, (_, i) => `u${i}@x.es`)
    expect(diffMembers(before.slice(0, 10), before).sospechosa).toBe(true)
    expect(diffMembers(before.slice(0, 45), before).sospechosa).toBe(false)
  })
  it('el margen de baja es de unos días', () => {
    const now = new Date('2026-10-23T10:00:00Z')
    expect(graceUntil(now)).toBe(new Date(now.getTime() + GRACE_DAYS * 86_400_000).toISOString())
  })
})

describe('Acceso de alumnas de Skool', () => {
  const base = { access_status: 'active' as const, subscription_status: 'none' as const, is_active: true, access_source: 'skool' as const }
  it('activa sin fecha → entra', () => {
    expect(hasActiveAccess({ ...base, access_expires_at: null } as never)).toBe(true)
  })
  it('de baja, dentro del margen → todavía entra', () => {
    expect(hasActiveAccess({ ...base, access_expires_at: new Date(Date.now() + 86_400_000).toISOString() } as never)).toBe(true)
  })
  it('de baja, margen acabado → no entra', () => {
    expect(hasActiveAccess({ ...base, access_expires_at: new Date(Date.now() - 1000).toISOString() } as never)).toBe(false)
  })
})
