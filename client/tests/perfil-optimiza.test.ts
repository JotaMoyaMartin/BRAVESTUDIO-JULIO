import { describe, expect, it } from 'vitest'
import { BIO_MAX, DESTACADA_MAX, NOMBRE_MAX, biosPara, destacadasPara, informe, linksPara, nombresPara, revisar, waLink, type PerfilDatos } from '@/lib/perfil/optimiza'

const d: PerfilDatos = {
  salon: 'Aura Hair', ciudad: 'Logroño, La Rioja', servicios: ['Balayage y mechas', 'Novias y peinados', 'Tratamientos'],
  estrella: 'Balayage y mechas', equipo: 'Trabajo sola', tono: 'Cercana', problema: ['Rubio que amarillea'],
  diferencia: 'Hago un diagnóstico del pelo antes de empezar', whatsapp: '600 123 456', google: '', reservaApp: '', reservaUrl: '', web: '',
}

describe('Optimiza tu perfil · propuestas', () => {
  it('nombre con especialidad y ciudad, sin pasarse de largo', () => {
    const n = nombresPara(d)
    expect(n[0]).toBe('Aura Hair | Balayage en Logroño')
    n.forEach(x => expect(x.length).toBeLessThanOrEqual(NOMBRE_MAX))
  })
  it('3 bios de 150 como máximo, con ciudad y sin calle', () => {
    const b = biosPara({ ...d, diferencia: 'x'.repeat(45), servicios: ['Balayage y mechas', 'Extensiones y mucho más largo', 'Canas'] })
    expect(b.map(x => x.estilo)).toEqual(['Elegante', 'Con emojis', 'Directa'])
    b.forEach(x => { expect(x.texto.length).toBeLessThanOrEqual(BIO_MAX); expect(x.texto).toContain('Logroño') })
    expect(biosPara(d)[1].texto).toContain('Rubios que no amarillean')
  })
  it('WhatsApp con prefijo de España y el mensaje ya escrito', () => {
    expect(waLink('600 123 456', 'Aura')).toBe(`https://wa.me/34600123456?text=${encodeURIComponent('Hola Aura, quiero pedir cita 😊')}`)
    expect(waLink('+34 600123456', '')).toContain('wa.me/34600123456')
    expect(waLink('123', '')).toBeNull()
  })
  it('links: primero reservar, luego cómo llegar; la app solo si la usa', () => {
    const l = linksPara(d)
    expect(l.map(x => x.titulo)).toEqual(['📅 Reserva por WhatsApp', '📍 Cómo llegar'])
    expect(l[1].url).toContain('google.com/maps')
    const conApp = linksPara({ ...d, whatsapp: '', reservaApp: 'Booksy', reservaUrl: 'booksy.com/aura', google: 'share.google/abc' })
    expect(conApp[0].url).toBeNull()
    expect(conApp[0].falta).toBeTruthy()
    expect(conApp[1].url).toBe('https://share.google/abc')
    expect(conApp[2].url).toBe('https://booksy.com/aura')
  })
  it('el link de Maps hecho con una búsqueda pide comprobarlo; el de su ficha, no', () => {
    expect(linksPara(d)[1].comprobar).toBe('Aura Hair Logroño, La Rioja')
    expect(linksPara({ ...d, google: 'share.google/abc' })[1].comprobar).toBeUndefined()
  })
  it('destacadas: las 5 de base + la especialidad, todas con nombre corto', () => {
    const ds = destacadasPara(d)
    expect(ds.map(x => x.nombre)).toEqual(['Balayage', 'Mi historia', 'Reseñas', 'Resultados', 'Servicios', 'Ubicación', 'Novias'])
    ds.forEach(x => expect(x.nombre.length).toBeLessThanOrEqual(DESTACADA_MAX))
    expect(destacadasPara({ ...d, equipo: 'Somos 4 o más', servicios: [], estrella: '' }).some(x => x.nombre === 'El equipo')).toBe(true)
  })
})

describe('Optimiza tu perfil · revisión de la captura', () => {
  it('detecta lo que falta en un perfil real', () => {
    const checks = revisar({
      nombre: 'Christofer Nuñez Estilista', categoria: 'Artista',
      bio: '✨ Especialistas en rubios\n📍 C/ Mayor 12, 14400 Pozoblanco', links: ['facebook.com/x'],
      destacadas: ['FORMACIO…', 'RESEÑAS', '✨'],
    }, d)
    const fail = checks.filter(c => !c.ok).map(c => c.label)
    expect(fail).toContain('Categoría de peluquería')
    expect(fail).toContain('Tu bio invita a reservar')
    expect(fail).toContain('Sin la dirección completa en la bio')
    expect(fail).toContain('Un link para reservar')
    expect(fail).toContain('Al menos 4 destacadas')
    expect(fail).toContain('Nombres de destacadas que se leen enteros')
    expect(fail).toContain('Ninguna destacada sin nombre')
    expect(fail).not.toContain('Tu nombre dice qué haces o dónde')
  })
  it('informe: sin captura no hay puntuación; la IA solo entra si sus textos son válidos', () => {
    const sin = informe(d, null)
    expect(sin.checks).toBeNull()
    expect(sin.ia).toBe(false)
    const malas = informe(d, null, { bios: [{ estilo: 'x', texto: 'y'.repeat(200) }] })
    expect(malas.bios[0].estilo).toBe('Elegante')
    const buenas = informe(d, { nombre: 'Aura Hair | Balayage en Logroño', bio: 'Reserva tu cita 👇\n📍 Logroño', links: ['wa.me/34600'], destacadas: ['Reseñas', 'Servicios', 'Resultados', 'Ubicación'], categoria: 'Peluquería' },
      { nombres: ['A', 'B'], bios: [{ estilo: 'Elegante', texto: 'a' }, { estilo: 'Con emojis', texto: 'b' }, { estilo: 'Directa', texto: 'c' }] })
    expect(buenas.ia).toBe(true)
    expect(buenas.puntuacion).toBe(100)
  })
})
