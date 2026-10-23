/**
 * OPTIMIZA TU PERFIL · fase 1 (23-oct-2026).
 * Con las respuestas de Mi Marca (y, si la hay, la lectura de una captura del
 * perfil) prepara: nombre con búsqueda (SEO), 3 bios, links en orden,
 * consejo de foto de perfil y destacadas. Todo con reglas: funciona aunque la
 * IA no responda; la IA solo propone textos mejores (bios y nombres).
 *
 * Patrones sacados de perfiles reales de clientas BRÄVE:
 * - los nombres de destacadas se cortan a ~11 letras → nombres cortos;
 * - la dirección completa NO va en la bio (va en el link de Maps);
 * - primer link: reservar por WhatsApp con el mensaje ya escrito.
 */

export interface PerfilDatos {
  salon: string
  ciudad: string
  servicios: string[]
  estrella: string
  equipo: string
  tono: string
  problema: string[]
  diferencia: string
  whatsapp: string
  /** Link de su ficha de Google (share.google / maps). Si no, se busca por nombre. */
  google: string
  reservaApp: string
  reservaUrl: string
  web: string
}

/** Lo que la IA lee de la captura del perfil (todo opcional). */
export interface PerfilActual {
  usuario?: string
  nombre?: string
  categoria?: string
  bio?: string
  links?: string[]
  destacadas?: string[]
  foto?: 'logo' | 'retrato' | 'otra'
}

export interface Check { ok: boolean; label: string; consejo: string }
export interface LinkPropuesto {
  orden: number; titulo: string; url: string | null; para: string; falta?: string
  /** Link hecho con una búsqueda: la estilista debe abrirlo y confirmar que sale SU salón. */
  comprobar?: string
}
export interface Destacada { nombre: string; que_poner: string; tipo: 'base' | 'especialidad' }
export interface Bio { estilo: string; texto: string }

export interface PerfilInforme {
  nombres: string[]
  bios: Bio[]
  links: LinkPropuesto[]
  foto: { tipo: 'logo' | 'retrato'; titulo: string; consejo: string; actual?: string }
  categoria: string
  destacadas: Destacada[]
  checks: Check[] | null
  puntuacion: number | null
  /** true si los textos los ha mejorado la IA. */
  ia: boolean
  creado: string
}

export const BIO_MAX = 150
export const NOMBRE_MAX = 64
export const DESTACADA_MAX = 11

const first = (s: string) => s.split(',')[0].trim()
export const ciudadCorta = (c: string) => first(c || '')
const solo = (equipo: string) => /sola/i.test(equipo || '')

/** Palabra que se busca en Instagram para cada servicio. */
const KEYWORD: Array<[RegExp, string]> = [
  [/balayage|mechas/i, 'Balayage'],
  [/rubio/i, 'Rubios'],
  [/novia|peinado|recogido/i, 'Novias'],
  [/alisad|keratina/i, 'Alisados'],
  [/extensi/i, 'Extensiones'],
  [/cana/i, 'Canas'],
  [/barber/i, 'Barbería'],
  [/tratamiento/i, 'Tratamientos capilares'],
  [/color/i, 'Color'],
  [/corte/i, 'Corte'],
]
export function keyword(servicio: string): string {
  for (const [re, kw] of KEYWORD) if (re.test(servicio)) return kw
  return servicio.trim()
}

/** Nombre corto de destacada para una especialidad. */
const ESPECIALIDAD: Array<[RegExp, string, string]> = [
  [/novia|peinado|recogido/i, 'Novias', 'Peinados de novia e invitada, la prueba y el gran día.'],
  [/balayage|mechas/i, 'Balayage', 'Tus mejores balayages: el proceso en 3 stories y el resultado.'],
  [/rubio/i, 'Rubios', 'Rubios antes y después y cómo cuidarlos para que no amarilleen.'],
  [/alisad|keratina/i, 'Alisados', 'Qué es, cuánto dura, para quién es y un resultado real.'],
  [/extensi/i, 'Extensiones', 'Tipos, el antes y después y cómo se cuidan.'],
  [/cana/i, 'Canas', 'Cómo cubres o integras las canas, con resultados reales.'],
  [/barber/i, 'Barbería', 'Cortes y arreglos de barba recientes.'],
  [/color/i, 'Color', 'Tus colores favoritos y cómo eliges el tono de cada clienta.'],
]

export function waLink(phone: string, salon: string): string | null {
  let d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 9 && /^[6789]/.test(d)) d = `34${d}`
  if (d.length < 10 || d.length > 15) return null
  const msg = `Hola${salon ? ` ${salon}` : ''}, quiero pedir cita 😊`
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`
}

export function mapsLink(salon: string, ciudad: string): string | null {
  const q = [salon, ciudad].filter(Boolean).join(' ').trim()
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

const normUrl = (u: string) => {
  const t = (u || '').trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

// ── Nombre ────────────────────────────────────────────────────────

export function nombresPara(d: PerfilDatos): string[] {
  const salon = d.salon.trim() || 'Tu salón'
  const kw = keyword(d.estrella || d.servicios[0] || 'Peluquería')
  const c = ciudadCorta(d.ciudad)
  const quien = solo(d.equipo) ? 'Especialista' : 'Especialistas'
  const out = c
    ? [`${salon} | ${kw} en ${c}`, `${salon} · Peluquería en ${c}`, `${salon} | ${quien} en ${kw.toLowerCase()} · ${c}`]
    : [`${salon} | ${quien} en ${kw.toLowerCase()}`, `${salon} · Peluquería`]
  return [...new Set(out.filter(n => n.length <= NOMBRE_MAX))]
}

// ── Bios ──────────────────────────────────────────────────────────

/** Acorta una bio quitando líneas del medio hasta que quepa en 150. */
export function fitBio(lines: string[]): string {
  const L = lines.filter(Boolean)
  while (L.join('\n').length > BIO_MAX && L.length > 2) L.splice(L.length - 2, 1)
  const t = L.join('\n')
  return t.length > BIO_MAX ? `${t.slice(0, BIO_MAX - 1)}…` : t
}

export function biosPara(d: PerfilDatos): Bio[] {
  const kw = keyword(d.estrella || d.servicios[0] || 'color')
  const otros = d.servicios.map(keyword).filter(k => k !== kw).slice(0, 2)
  const c = ciudadCorta(d.ciudad)
  const quien = solo(d.equipo) ? 'Especialista' : 'Especialistas'
  const problema = (d.problema[0] || '').toLowerCase()
  const dif = (d.diferencia || '').split(/[.\n]/)[0].trim()
  const difCorta = dif.length > 3 && dif.length <= 48 ? dif : ''
  const promesa = problema.includes('amarill') ? 'Rubios que no amarillean'
    : problema.includes('dañad') || problema.includes('quebrad') ? 'Color que cuida tu pelo'
    : problema.includes('cana') ? 'Canas bonitas y sin esclavitud'
    : problema.includes('volumen') ? 'Melenas con vida y volumen'
    : problema.includes('encresp') ? 'Melenas suaves y sin frizz'
    : `Tu ${kw.toLowerCase()} a tu medida`

  return [
    {
      estilo: 'Elegante',
      texto: fitBio([
        `${quien} en ${[kw, ...otros].join(' · ').toLowerCase()}`,
        difCorta || promesa,
        c ? `${c} · Reserva tu cita ↓` : 'Reserva tu cita ↓',
      ]),
    },
    {
      estilo: 'Con emojis',
      texto: fitBio([
        `✨ ${quien} en ${kw.toLowerCase()}${otros[0] ? ` y ${otros[0].toLowerCase()}` : ''}`,
        `💫 ${promesa}`,
        c ? `📍 ${c}` : '',
        '👇 Reserva tu cita por WhatsApp',
      ]),
    },
    {
      estilo: 'Directa',
      texto: fitBio([
        `${promesa}.`,
        difCorta ? `${difCorta}.` : `${kw} con diagnóstico previo.`,
        `${c ? `${c}. ` : ''}Escríbeme y te digo qué te favorece 👇`,
      ]),
    },
  ]
}

// ── Links ─────────────────────────────────────────────────────────

export function linksPara(d: PerfilDatos): LinkPropuesto[] {
  const wa = waLink(d.whatsapp, d.salon.trim())
  const google = normUrl(d.google) || mapsLink(d.salon.trim(), d.ciudad.trim())
  const out: LinkPropuesto[] = [
    {
      orden: 1, titulo: '📅 Reserva por WhatsApp', url: wa,
      para: 'Es el primero que se ve: le llega un mensaje ya escrito para pedir cita.',
      falta: wa ? undefined : 'Escribe tu número de WhatsApp para crearlo.',
    },
    {
      orden: 2, titulo: '📍 Cómo llegar', url: google,
      para: d.google ? 'Tu ficha de Google: mapa, horario y reseñas en un toque.' : 'Busca tu salón en Google Maps. Lo mejor es pegar el link de tu ficha de Google: abre justo tu salón y se ven tus reseñas.',
      falta: google ? undefined : 'Escribe el nombre del salón y la ciudad.',
      comprobar: !d.google.trim() && google ? [d.salon, d.ciudad].map(s => s.trim()).filter(Boolean).join(' ') : undefined,
    },
  ]
  if (d.reservaUrl.trim()) {
    out.push({ orden: 3, titulo: `🗓️ Reserva online${d.reservaApp ? ` (${d.reservaApp})` : ''}`, url: normUrl(d.reservaUrl), para: 'Para quien prefiere elegir hora sin escribir.' })
  }
  if (d.web.trim()) {
    out.push({ orden: out.length + 1, titulo: '🌐 Web', url: normUrl(d.web), para: 'Al final: lo importante es que reserven.' })
  }
  return out
}

// ── Foto de perfil ────────────────────────────────────────────────

export function fotoPara(d: PerfilDatos, actual?: PerfilActual): PerfilInforme['foto'] {
  const tipo = solo(d.equipo) ? 'retrato' : 'logo'
  const base = tipo === 'retrato'
    ? { tipo, titulo: 'Un retrato tuyo, profesional', consejo: 'Trabajas sola: la gente reserva contigo. Una foto tuya de hombros para arriba, buena luz, fondo liso y sonriendo. Que tu pelo sea tu mejor anuncio.' } as const
    : { tipo, titulo: 'Tu logo, limpio y legible', consejo: 'Sois equipo: el logo identifica al salón. Letras grandes y centradas, fondo de un solo color y sin detalles pequeños (en el círculo se ve diminuto).' } as const
  if (!actual?.foto) return { ...base }
  const nombre = { logo: 'un logo', retrato: 'un retrato', otra: 'otra foto' }[actual.foto]
  return { ...base, actual: actual.foto === tipo ? `Ahora tienes ${nombre}: vas bien.` : `Ahora tienes ${nombre}.` }
}

// ── Destacadas ────────────────────────────────────────────────────

export const DESTACADAS_BASE: Destacada[] = [
  { nombre: 'Mi historia', que_poner: 'Quién eres, desde cuándo peinas y por qué lo haces. 2–3 stories hablando a cámara.', tipo: 'base' },
  { nombre: 'Reseñas', que_poner: 'Capturas de mensajes y reseñas de Google de clientas contentas.', tipo: 'base' },
  { nombre: 'Resultados', que_poner: 'Antes y después de tus trabajos (el nombre corto evita que se corte «Antes y después»).', tipo: 'base' },
  { nombre: 'Servicios', que_poner: 'Qué haces, para quién es cada servicio y desde qué precio.', tipo: 'base' },
  { nombre: 'Ubicación', que_poner: 'La fachada, cómo llegar, horario y la story con el botón de reservar.', tipo: 'base' },
]

export function destacadasPara(d: PerfilDatos): Destacada[] {
  const esp: Destacada[] = []
  const servicios = [d.estrella, ...d.servicios].filter(Boolean)
  for (const s of servicios) {
    const hit = ESPECIALIDAD.find(([re]) => re.test(s))
    if (hit && !esp.some(e => e.nombre === hit[1])) esp.push({ nombre: hit[1], que_poner: hit[2], tipo: 'especialidad' })
  }
  if (!solo(d.equipo) && d.equipo) esp.push({ nombre: 'El equipo', que_poner: 'Una story por persona: nombre, en qué es especialista y una foto trabajando.', tipo: 'especialidad' })
  // Las 5 de base + hasta 2 de especialidad (la del servicio estrella, delante).
  return [...esp.slice(0, 1), ...DESTACADAS_BASE, ...esp.slice(1, 2)]
}

// ── Revisión del perfil actual (si se leyó la captura) ───────────

const BOOKING_RE = /wa\.me|wa\.link|whatsapp|booksy|treatwell|fresha|bewe|reserv|cita|google|maps|goo\.gl|linktr/i
const CTA_RE = /reserv|cita|escr[ií]be|whatsapp|👇|↓|pide/i
const ADDRESS_RE = /\b(c\/|calle|avda|avenida|plaza|pza|carrer|n[ºo°]\s?\d)|\b\d{5}\b/i
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+$/u

export function revisar(actual: PerfilActual, d: PerfilDatos): Check[] {
  const nombre = actual.nombre ?? ''
  const bio = actual.bio ?? ''
  const c = ciudadCorta(d.ciudad).toLowerCase()
  const kws = [d.estrella, ...d.servicios].map(keyword).map(k => k.toLowerCase())
  const dest = actual.destacadas ?? []
  const links = actual.links ?? []
  const checks: Check[] = []
  if (actual.nombre !== undefined) {
    const lower = nombre.toLowerCase()
    checks.push({
      ok: (!!c && lower.includes(c)) || kws.some(k => k && lower.includes(k)) || /peluquer|hair|estilist|sal[oó]n/i.test(nombre),
      label: 'Tu nombre dice qué haces o dónde',
      consejo: 'El campo «Nombre» sale en el buscador de Instagram. Añade tu especialidad y tu ciudad.',
    })
  }
  if (actual.categoria !== undefined) {
    checks.push({ ok: /peluquer|sal[oó]n|belleza|barber|hair/i.test(actual.categoria), label: 'Categoría de peluquería', consejo: 'Pon la categoría «Peluquería» o «Salón de belleza» (Editar perfil → Categoría).' })
  }
  if (actual.bio !== undefined) {
    checks.push({ ok: CTA_RE.test(bio), label: 'Tu bio invita a reservar', consejo: 'Termina la bio con «Reserva tu cita 👇» apuntando al link de WhatsApp.' })
    checks.push({ ok: (!!c && bio.toLowerCase().includes(c)) || /📍/.test(bio), label: 'Se ve en qué ciudad estás', consejo: 'Pon «📍 Tu ciudad» en una línea.' })
    checks.push({ ok: !ADDRESS_RE.test(bio), label: 'Sin la dirección completa en la bio', consejo: 'La calle ocupa sitio: deja solo la ciudad y pon la dirección en el link «Cómo llegar».' })
  }
  if (actual.links !== undefined) {
    checks.push({ ok: links.some(l => BOOKING_RE.test(l)), label: 'Un link para reservar', consejo: 'Que el primer link sea reservar por WhatsApp, con el mensaje ya escrito.' })
  }
  if (actual.destacadas !== undefined) {
    checks.push({ ok: dest.length >= 4, label: 'Al menos 4 destacadas', consejo: 'Las destacadas son tu escaparate: mínimo Reseñas, Resultados, Servicios y Ubicación.' })
    if (dest.length) {
      const largos = dest.filter(n => n.replace(/…$/, '').length > DESTACADA_MAX || n.endsWith('…'))
      const vacios = dest.filter(n => !n.trim() || EMOJI_ONLY.test(n))
      checks.push({ ok: !largos.length, label: 'Nombres de destacadas que se leen enteros', consejo: `Se cortan a partir de ~${DESTACADA_MAX} letras${largos.length ? ` (${largos.slice(0, 2).join(', ')})` : ''}. Usa nombres cortos.` })
      checks.push({ ok: !vacios.length, label: 'Ninguna destacada sin nombre', consejo: 'Una destacada con solo un emoji no dice qué hay dentro. Ponle una palabra.' })
    }
  }
  return checks
}

export function informe(d: PerfilDatos, actual: PerfilActual | null, ia?: { nombres?: string[]; bios?: Bio[] }): PerfilInforme {
  const checks = actual ? revisar(actual, d) : null
  const aiBios = (ia?.bios ?? []).filter(b => b?.texto && b.texto.length <= BIO_MAX).slice(0, 3)
  const aiNombres = (ia?.nombres ?? []).filter(n => typeof n === 'string' && n.trim() && n.length <= NOMBRE_MAX)
  const bios = aiBios.length === 3 ? aiBios : biosPara(d)
  return {
    nombres: aiNombres.length >= 2 ? [...new Set(aiNombres)].slice(0, 3) : nombresPara(d),
    bios,
    links: linksPara(d),
    foto: fotoPara(d, actual ?? undefined),
    categoria: solo(d.equipo) ? 'Peluquería (o «Estilista»)' : 'Peluquería o Salón de belleza',
    destacadas: destacadasPara(d),
    checks: checks && checks.length ? checks : null,
    puntuacion: checks && checks.length ? Math.round((checks.filter(c => c.ok).length / checks.length) * 100) : null,
    ia: aiBios.length === 3 || aiNombres.length >= 2,
    creado: new Date().toISOString(),
  }
}

/** Prompt de la IA para leer la captura (devuelve JSON PerfilActual). */
export function buildLecturaPrompt(): string {
  return `Esta imagen es una captura de un perfil de Instagram de una peluquería.
Copia EXACTAMENTE lo que se ve (no inventes nada; si algo no se ve, omite el campo).
Devuelve SOLO este JSON:
{"usuario":"","nombre":"(el nombre en negrita bajo o junto al usuario)","categoria":"(texto gris tipo «Salón de belleza», si aparece)","bio":"(las líneas de la bio, separadas por \\n)","links":["(cada link que se ve)"],"destacadas":["(el texto bajo cada círculo de destacadas, tal cual, con … si está cortado)"],"foto":"logo | retrato | otra"}`
}

/** Prompt de la IA para mejorar nombres y bios. */
export function buildTextosPrompt(d: PerfilDatos, actual: PerfilActual | null): string {
  return `Eres la estratega de Instagram de BRÄVE, especialista en peluquerías en España. Español de España, sencillo, trato de tú.
Datos del salón:
- Nombre: ${d.salon || '(sin nombre)'}
- Ciudad: ${d.ciudad || '(sin ciudad)'}
- ${solo(d.equipo) ? 'Trabaja sola' : `Equipo: ${d.equipo || 'sin dato'}`}
- Servicios: ${d.servicios.join(', ') || 'sin dato'}; servicio estrella: ${d.estrella || 'sin dato'}
- Problemas que resuelve: ${d.problema.join(', ') || 'sin dato'}
- Lo que la hace diferente: ${d.diferencia || 'sin dato'}
- Tono: ${d.tono || 'cercano'}
${actual?.bio ? `Bio actual:\n${actual.bio}\n` : ''}${actual?.nombre ? `Nombre actual: ${actual.nombre}\n` : ''}
Escribe:
1) "nombres": 3 opciones para el campo «Nombre» de Instagram (máx. ${NOMBRE_MAX} caracteres). Fórmula: nombre del salón + especialidad + ciudad, p. ej. «Aura Hair | Balayage en Madrid». Es lo que sale en el buscador.
2) "bios": 3 bios de máx. ${BIO_MAX} caracteres contando saltos de línea, 3-4 líneas cada una:
   - estilo "Elegante": sobria, casi sin emojis.
   - estilo "Con emojis": una línea por idea con ✨ 💫 📍 👇.
   - estilo "Directa": la promesa a la clienta y la llamada a escribir.
   Todas: especialidad, una promesa concreta, «📍 ciudad» (NUNCA la calle) y termina con «Reserva tu cita 👇» o similar. Nada de palabras técnicas.
Devuelve SOLO JSON: {"nombres":["","",""],"bios":[{"estilo":"Elegante","texto":""},{"estilo":"Con emojis","texto":""},{"estilo":"Directa","texto":""}]}`
}
