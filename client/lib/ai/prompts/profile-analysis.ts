/**
 * ANÁLISIS DE PERFIL · textos con IA (22-oct-2026). Recibe el resumen
 * calculado (lib/social/profile-stats.ts) + perfil + marca, y devuelve
 * consejos en español sencillo. La IA NO pone cifras nuevas: las cifras del
 * informe salen siempre de los datos; aquí solo se redacta.
 */
import { FORMAT_LABEL, type ProfileStats, type StatsProfileInput } from '@/lib/social/profile-stats'

export type IdeaType = 'reel' | 'carrusel' | 'story'

export interface ProfileAdvice {
  resumen: string
  bios: Array<{ texto: string; por_que: string }>
  nombre: { sugerido: string; por_que: string } | null
  keywords: string[]
  mezcla: { reels: number; carruseles: number; fotos: number; stories_dias: number; por_que: string } | null
  que_funciona: string[]
  que_mejorar: string[]
  ideas: Array<{ titulo: string; tipo: IdeaType; por_que: string }>
}

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

export function buildProfileAnalysisPrompt(
  profile: StatsProfileInput,
  stats: ProfileStats,
  brandContext: string | null,
): string {
  const formats = stats.formats
    .map(f => `- ${FORMAT_LABEL[f.format]}: ${f.count} publicaciones (${f.share}%), media ${f.avgInteractions} me gusta+comentarios${f.avgReach !== null ? `, alcance medio ${f.avgReach}` : ''}`)
    .join('\n')
  const posts = (list: ProfileStats['topPosts']) =>
    list.map(p => `- [${FORMAT_LABEL[p.format]}] ${p.interactions} interacciones · «${cut(p.caption.replace(/\s+/g, ' '), 220) || '(sin texto)'}»`).join('\n')

  return `Eres la estratega de Instagram de BRÄVE, especialista en peluquerías y estilistas en España.
Analiza este perfil y da mejoras concretas. Escribe en español de España, cercano y SENCILLO (nada de palabras técnicas como "engagement", "KPI", "algoritmo", "CTA", "insights"; di "interacción", "llamada a la acción" → "pide que te escriban", etc.). Trata a la estilista de "tú".

REGLAS IMPORTANTES:
- No inventes cifras, seguidores ni resultados. Usa solo los datos de abajo.
- Si un dato falta, no lo supongas.
- Las bios deben caber en 150 caracteres, decir qué haces, para quién y en qué ciudad/zona si se sabe, y terminar con cómo pedir cita.
- El nombre del perfil (campo "Nombre" de Instagram, distinto del @usuario) sirve para salir en búsquedas: propone uno de máximo 64 caracteres con la especialidad (p. ej. "Laura | Balayage y color en Valencia"). No inventes ciudad si no se conoce: usa [tu ciudad].

PERFIL
- Usuario: @${profile.username ?? 'desconocido'}
- Nombre actual: ${profile.name || '(no disponible)'}
- Bio actual: ${profile.biography ? `«${profile.biography}»` : '(no disponible)'}
- Seguidores: ${profile.followers ?? '(no disponible)'}

NÚMEROS (últimas ${stats.postsAnalyzed} publicaciones, en ${stats.periodDays} días)
- Publica ${stats.postsPerWeek} veces por semana; ${stats.postsLast30Days} en los últimos 30 días; última hace ${stats.daysSinceLastPost ?? '?'} días.
- Media de me gusta+comentarios por publicación: ${stats.avgInteractions}${stats.engagementRate !== null ? ` (${stats.engagementRate}% de sus seguidores)` : ''}.
${formats || '- Sin publicaciones'}
- Mejores días: ${stats.bestDays ? stats.bestDays.map(d => d.label).join(', ') : 'sin datos suficientes'}
- Mejores horas: ${stats.bestTimes ? stats.bestTimes.map(d => d.label).join(', ') : 'sin datos suficientes'}
- Textos: ${stats.captionAvgLength} caracteres de media; ${stats.captionsWithQuestionPct}% hacen una pregunta.

LAS QUE MEJOR FUNCIONARON
${posts(stats.topPosts) || '- (ninguna)'}

LAS QUE PEOR FUNCIONARON
${posts(stats.weakPosts) || '- (no hay suficientes)'}
${brandContext ? `\nSU NEGOCIO (de Mi Marca)\n${cut(brandContext, 2500)}\n` : ''}
Devuelve SOLO este JSON, sin texto fuera:
{
  "resumen": "2-3 frases: cómo está su Instagram y lo más importante que debe cambiar",
  "bios": [{"texto": "bio de máx. 150 caracteres", "por_que": "1 frase"}, {"texto": "...", "por_que": "..."}, {"texto": "...", "por_que": "..."}],
  "nombre": {"sugerido": "máx. 64 caracteres", "por_que": "1 frase"},
  "keywords": ["5 a 8 palabras que sus clientas buscarían, p. ej. balayage, mechas, peluquería + ciudad"],
  "mezcla": {"reels": 2, "carruseles": 1, "fotos": 0, "stories_dias": 5, "por_que": "1-2 frases basadas en sus números"},
  "que_funciona": ["3 frases concretas basadas en sus mejores publicaciones"],
  "que_mejorar": ["3 cambios concretos y fáciles"],
  "ideas": [{"titulo": "idea de publicación concreta", "tipo": "reel|carrusel|story", "por_que": "1 frase"}]
}
Da 5 ideas. La mezcla es por SEMANA y debe ser realista para una estilista con poco tiempo.`
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? cut(v.trim(), max) : '')
const int = (v: unknown, min: number, max: number): number => {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : min
}
const strList = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.map(x => str(x, len)).filter(Boolean).slice(0, max) : []

/** Valida y recorta la respuesta de la IA. Devuelve null si no sirve. */
export function parseProfileAdvice(raw: unknown): ProfileAdvice | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const resumen = str(r.resumen, 600)
  const bios = Array.isArray(r.bios)
    ? r.bios
        .map(b => ({ texto: str((b as Record<string, unknown>)?.texto, 150), por_que: str((b as Record<string, unknown>)?.por_que, 200) }))
        .filter(b => b.texto)
        .slice(0, 3)
    : []
  if (!resumen && bios.length === 0) return null

  const nombreRaw = (r.nombre ?? null) as Record<string, unknown> | null
  const nombre = nombreRaw && str(nombreRaw.sugerido, 64)
    ? { sugerido: str(nombreRaw.sugerido, 64), por_que: str(nombreRaw.por_que, 200) }
    : null

  const m = (r.mezcla ?? null) as Record<string, unknown> | null
  const mezcla = m
    ? {
        reels: int(m.reels, 0, 7),
        carruseles: int(m.carruseles, 0, 7),
        fotos: int(m.fotos, 0, 7),
        stories_dias: int(m.stories_dias, 0, 7),
        por_que: str(m.por_que, 300),
      }
    : null

  const ideas = Array.isArray(r.ideas)
    ? r.ideas
        .map(i => {
          const o = (i ?? {}) as Record<string, unknown>
          const tipo: IdeaType = o.tipo === 'carrusel' || o.tipo === 'story' ? o.tipo : 'reel'
          return { titulo: str(o.titulo, 140), tipo, por_que: str(o.por_que, 220) }
        })
        .filter(i => i.titulo)
        .slice(0, 6)
    : []

  return {
    resumen,
    bios,
    nombre,
    keywords: strList(r.keywords, 8, 40),
    mezcla,
    que_funciona: strList(r.que_funciona, 4, 220),
    que_mejorar: strList(r.que_mejorar, 4, 220),
    ideas,
  }
}
