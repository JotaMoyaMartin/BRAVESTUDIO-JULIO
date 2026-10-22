/**
 * Informe de EJEMPLO para el modo demo (sin cuenta real). Las publicaciones
 * son de muestra, pero los números se calculan con el mismo motor real
 * (computeProfileStats) para enseñar exactamente cómo se verá. La UI lo
 * marca siempre como «Ejemplo».
 */
import { computeProfileStats, type StatsMediaInput } from './profile-stats'
import type { ProfileReport } from './analysis'

const SAMPLE: Array<[string, string, number, number, string]> = [
  // [tipo, días atrás + hora, me gusta, comentarios, texto]
  ['REELS', '1T19', 214, 31, 'De castaño apagado a balayage miel en una sesión ✨ ¿Te atreverías?'],
  ['CAROUSEL_ALBUM', '3T13', 96, 8, '5 errores que estropean tu rubio en casa'],
  ['IMAGE', '5T10', 41, 2, 'Nuevo producto en el salón'],
  ['REELS', '8T20', 188, 22, 'Así cuidamos tu melena antes de cortar'],
  ['CAROUSEL_ALBUM', '10T19', 120, 14, 'Guía: qué pedir a tu peluquera si quieres mechas naturales'],
  ['IMAGE', '13T11', 38, 1, 'Horario de esta semana'],
  ['REELS', '15T21', 260, 40, 'Transformación de la semana: de negro a chocolate'],
  ['IMAGE', '18T10', 52, 3, 'Antes y después de Marta'],
  ['CAROUSEL_ALBUM', '21T13', 88, 6, 'Por qué tu tinte dura poco'],
  ['REELS', '25T19', 175, 19, '¿Corte bob o long bob? Te lo cuento'],
  ['IMAGE', '29T12', 35, 2, 'Feliz lunes'],
  ['REELS', '33T20', 150, 12, 'Un día en el salón'],
  ['CAROUSEL_ALBUM', '37T19', 104, 11, 'Cómo lavar el pelo con mechas'],
  ['IMAGE', '41T10', 30, 1, 'Promoción de otoño'],
]

export function buildDemoReport(now = new Date()): ProfileReport {
  const media: StatsMediaInput[] = SAMPLE.map(([type, when, likes, comments, caption], i) => {
    const [daysAgo, hour] = when.split('T').map(Number)
    const d = new Date(now.getTime() - daysAgo * 86_400_000)
    d.setUTCHours(hour - 2, 0, 0, 0) // hora de Madrid aproximada
    return {
      media_type: type === 'REELS' ? 'VIDEO' : type,
      media_product_type: type === 'REELS' ? 'REELS' : 'FEED',
      caption,
      posted_at: d.toISOString(),
      permalink: null,
      thumbnail_url: null,
      metrics: { likes, comments, ...(type !== 'CAROUSEL_ALBUM' ? { reach: likes * 9 + i * 13 } : {}) },
    }
  })
  const profile = { username: 'tu_salon', name: 'Tu Salón', biography: 'Peluquería 💇‍♀️ Cita por DM', followers: 3200 }
  const stats = computeProfileStats(profile, media, { now })
  return {
    version: 1,
    demo: true,
    generatedAt: now.toISOString(),
    profile: { ...profile, bioAvailable: true, avatarUrl: null, mediaCount: media.length },
    stats,
    advice: {
      resumen:
        'Tus reels de transformaciones son lo que más mueve tu cuenta: tienen más del doble de interacción que tus fotos. Publica menos fotos sueltas (horarios, promociones) y convierte esos temas en reels o stories.',
      bios: [
        { texto: 'Balayage y color natural en [tu ciudad] ✨ Te ayudo a lucir un rubio que dura | Pide cita aquí 👇', por_que: 'Dice qué haces, dónde y cómo pedir cita.' },
        { texto: 'Especialista en mechas y castaños luminosos 💫 [tu ciudad] · Transformaciones cada semana · Cita por WhatsApp 👇', por_que: 'Destaca tu especialidad y lo que verán en tu perfil.' },
        { texto: 'Tu pelo, sin miedo al cambio 💇‍♀️ Color y corte a medida en [tu ciudad] | Reserva en el enlace', por_que: 'Más cercana, pensada para clientas que dudan.' },
      ],
      nombre: { sugerido: 'Tu Salón | Balayage y color en [tu ciudad]', por_que: 'El nombre cuenta para las búsquedas: incluye lo que buscan tus clientas.' },
      keywords: ['balayage', 'mechas', 'peluquería [tu ciudad]', 'color natural', 'corte bob', 'rubio'],
      mezcla: { reels: 3, carruseles: 1, fotos: 0, stories_dias: 5, por_que: 'Los reels te traen más interacción; un carrusel útil a la semana mantiene los guardados.' },
      que_funciona: [
        'Los reels de «antes y después» con una pregunta al final.',
        'Los carruseles con consejos prácticos sobre el cuidado del color.',
        'Publicar por la tarde-noche.',
      ],
      que_mejorar: [
        'Deja los avisos de horario y promociones para las stories.',
        'Termina cada texto pidiendo que te escriban para pedir cita.',
        'Publica al menos 3 veces por semana sin huecos largos.',
      ],
      ideas: [
        { titulo: 'Transformación: de castaño apagado a balayage miel', tipo: 'reel', por_que: 'Es tu formato con más interacción.' },
        { titulo: '3 señales de que tu rubio necesita un matiz', tipo: 'carrusel', por_que: 'Los consejos de color se guardan mucho.' },
        { titulo: 'Encuesta: ¿bob o melena larga este otoño?', tipo: 'story', por_que: 'Conversa con tus seguidoras y te da ideas.' },
        { titulo: 'Qué pasa en una cita de color de 3 horas', tipo: 'reel', por_que: 'Quita miedos a las clientas nuevas.' },
        { titulo: 'Errores al lavar el pelo con mechas', tipo: 'carrusel', por_que: 'Repite un tema que ya te funcionó.' },
      ],
    },
    missing: ['Esto es un EJEMPLO con publicaciones de muestra. Con tu cuenta conectada verás tus datos reales.', ...stats.notes],
  }
}
