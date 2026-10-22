import { describe, it, expect, afterEach } from 'vitest'
import { computeProfileStats, postFormat, type StatsMediaInput } from '@/lib/social/profile-stats'
import { parseProfileAdvice, buildProfileAnalysisPrompt } from '@/lib/ai/prompts/profile-analysis'
import { buildDemoReport } from '@/lib/social/demo-analysis'
import { buildPublishPlan, canPublish } from '@/lib/social/publish'
import { requestedScopes, PUBLISH_SCOPE } from '@/lib/social/instagram'
import { buildBraviChecklist } from '@/lib/home-bravi'

const NOW = new Date('2026-10-22T12:00:00Z')

function post(type: 'REELS' | 'CAROUSEL_ALBUM' | 'IMAGE', daysAgo: number, hourUTC: number, likes: number, comments = 0, extra: Record<string, unknown> = {}): StatsMediaInput {
  const d = new Date(NOW.getTime() - daysAgo * 86_400_000)
  d.setUTCHours(hourUTC, 0, 0, 0)
  return {
    media_type: type === 'REELS' ? 'VIDEO' : type,
    media_product_type: type === 'REELS' ? 'REELS' : 'FEED',
    caption: `post ${daysAgo}?`,
    posted_at: d.toISOString(),
    permalink: null,
    metrics: { likes, comments, ...extra },
  }
}

describe('postFormat', () => {
  it('clasifica reels, carruseles, fotos y descarta stories', () => {
    expect(postFormat({ media_type: 'VIDEO', media_product_type: 'REELS' })).toBe('reel')
    expect(postFormat({ media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED' })).toBe('carrusel')
    expect(postFormat({ media_type: 'IMAGE', media_product_type: 'FEED' })).toBe('foto')
    expect(postFormat({ media_type: 'IMAGE', media_product_type: 'STORY' })).toBeNull()
  })
})

describe('computeProfileStats', () => {
  it('sin publicaciones → todo a cero y aviso honesto', () => {
    const s = computeProfileStats({ username: 'x', followers: 100 }, [], { now: NOW })
    expect(s.postsAnalyzed).toBe(0)
    expect(s.bestFormat).toBeNull()
    expect(s.bestDays).toBeNull()
    expect(s.notes.join(' ')).toMatch(/Todavía no hay publicaciones/)
  })

  it('con pocas publicaciones no afirma mejores días/horas', () => {
    const media = [post('REELS', 1, 18, 100), post('IMAGE', 3, 9, 10), post('REELS', 5, 18, 90)]
    const s = computeProfileStats({ username: 'x', followers: 1000 }, media, { now: NOW })
    expect(s.bestDays).toBeNull()
    expect(s.bestTimes).toBeNull()
    expect(s.notes.some(n => n.includes('orientativas'))).toBe(true)
  })

  it('calcula formatos, mejor formato, frecuencia e interacción', () => {
    const media = [
      post('REELS', 1, 18, 200, 20, { reach: 2000 }),
      post('REELS', 8, 18, 180, 20, { reach: 1800 }),
      post('IMAGE', 4, 9, 30, 2, { reach: 400 }),
      post('IMAGE', 11, 9, 20, 2, { reach: 300 }),
      post('CAROUSEL_ALBUM', 6, 12, 80, 10),
      post('CAROUSEL_ALBUM', 13, 12, 60, 4),
    ]
    const s = computeProfileStats({ username: 'x', followers: 2000 }, media, { now: NOW })
    expect(s.postsAnalyzed).toBe(6)
    expect(s.bestFormat).toBe('reel')
    const reels = s.formats.find(f => f.format === 'reel')!
    expect(reels.count).toBe(2)
    expect(reels.avgInteractions).toBe(210)
    expect(reels.avgReach).toBe(1900)
    // Instagram no da alcance de carrusel: null, nunca 0 inventado.
    expect(s.formats.find(f => f.format === 'carrusel')!.avgReach).toBeNull()
    expect(s.notes.some(n => n.includes('carruseles'))).toBe(true)
    expect(s.daysSinceLastPost).toBe(1)
    expect(s.engagementRate).not.toBeNull()
    expect(s.topPosts[0].interactions).toBe(220)
    expect(s.captionsWithQuestionPct).toBe(100)
  })

  it('con datos suficientes da mejores días y horas (zona Madrid)', () => {
    const media = Array.from({ length: 12 }, (_, i) => post('REELS', i * 2 + 1, i % 2 ? 18 : 8, i % 2 ? 200 : 20))
    const s = computeProfileStats({ username: 'x', followers: 2000 }, media, { now: NOW })
    expect(s.bestTimes).not.toBeNull()
    expect(s.bestTimes![0].label).toMatch(/Noche|Tarde/)
  })

  it('sin seguidores no calcula el % de interacción', () => {
    const s = computeProfileStats({ username: 'x', followers: null }, [post('REELS', 1, 18, 10)], { now: NOW })
    expect(s.engagementRate).toBeNull()
  })
})

describe('parseProfileAdvice', () => {
  it('recorta bios a 150, limita listas y normaliza tipos de idea', () => {
    const a = parseProfileAdvice({
      resumen: 'Bien',
      bios: [{ texto: 'x'.repeat(300), por_que: 'p' }, { texto: '' }],
      nombre: { sugerido: 'Laura | Balayage', por_que: 'búsquedas' },
      keywords: ['a', 'b', 3],
      mezcla: { reels: 20, carruseles: '2', fotos: -1, stories_dias: 5, por_que: 'p' },
      que_funciona: ['1', '2'],
      que_mejorar: ['1'],
      ideas: [{ titulo: 'Idea', tipo: 'video' }, { titulo: 'Car', tipo: 'carrusel' }],
    })!
    expect(a.bios).toHaveLength(1)
    expect(a.bios[0].texto.length).toBeLessThanOrEqual(150)
    expect(a.keywords).toEqual(['a', 'b'])
    expect(a.mezcla).toMatchObject({ reels: 7, carruseles: 2, fotos: 0 })
    expect(a.ideas.map(i => i.tipo)).toEqual(['reel', 'carrusel'])
  })

  it('respuesta vacía o rota → null', () => {
    expect(parseProfileAdvice(null)).toBeNull()
    expect(parseProfileAdvice({})).toBeNull()
  })

  it('el prompt incluye los números reales y pide no inventar', () => {
    const s = computeProfileStats({ username: 'salon', followers: 500 }, [post('REELS', 1, 18, 10)], { now: NOW })
    const p = buildProfileAnalysisPrompt({ username: 'salon', followers: 500, biography: null }, s, null)
    expect(p).toContain('@salon')
    expect(p).toContain('No inventes')
    expect(p).toContain('(no disponible)')
  })
})

describe('informe de ejemplo (demo)', () => {
  it('va marcado como ejemplo y sus números salen del motor real', () => {
    const r = buildDemoReport(NOW)
    expect(r.demo).toBe(true)
    expect(r.missing[0]).toMatch(/EJEMPLO/)
    expect(r.stats.postsAnalyzed).toBeGreaterThan(10)
    expect(r.stats.bestFormat).toBe('reel')
  })
})

describe('publicar (preparado, apagado)', () => {
  afterEach(() => { delete process.env.INSTAGRAM_PUBLISH_ENABLED })

  it('por defecto NO pide el permiso de publicar ni deja publicar', () => {
    expect(requestedScopes()).not.toContain(PUBLISH_SCOPE)
    expect(canPublish([PUBLISH_SCOPE])).toBe(false)
  })

  it('con INSTAGRAM_PUBLISH_ENABLED=1 lo pide y exige que esté concedido', () => {
    process.env.INSTAGRAM_PUBLISH_ENABLED = '1'
    expect(requestedScopes()).toContain(PUBLISH_SCOPE)
    expect(canPublish(['instagram_business_basic'])).toBe(false)
    expect(canPublish([PUBLISH_SCOPE])).toBe(true)
  })

  it('carrusel: hijos + contenedor CAROUSEL; valida número de imágenes y JPEG', () => {
    const urls = ['https://x.com/1.jpg', 'https://x.com/2.jpg']
    const ok = buildPublishPlan({ kind: 'carousel', imageUrls: urls, caption: 'Hola' })
    expect(ok.ok && ok.plan.children).toHaveLength(2)
    expect(ok.ok && ok.plan.main).toMatchObject({ media_type: 'CAROUSEL', caption: 'Hola' })
    expect(buildPublishPlan({ kind: 'carousel', imageUrls: [urls[0]] }).ok).toBe(false)
    expect(buildPublishPlan({ kind: 'carousel', imageUrls: ['https://x.com/1.png', urls[1]] }).ok).toBe(false)
    expect(buildPublishPlan({ kind: 'image', imageUrls: ['http://x.com/1.jpg'] }).ok).toBe(false)
  })

  it('reel: REELS + video_url pública; story de imagen', () => {
    const r = buildPublishPlan({ kind: 'reel', videoUrl: 'https://x.com/v.mp4' })
    expect(r.ok && r.plan.main).toMatchObject({ media_type: 'REELS', share_to_feed: 'true' })
    expect(r.ok && r.plan.isVideo).toBe(true)
    expect(buildPublishPlan({ kind: 'reel' }).ok).toBe(false)
    const st = buildPublishPlan({ kind: 'story', imageUrls: ['https://x.com/s.jpg'] })
    expect(st.ok && st.plan.main).toMatchObject({ media_type: 'STORIES' })
  })
})

describe('checklist de Inicio', () => {
  it('«Conecta Instagram y mide» se completa al conectar Instagram', () => {
    const base = { brandState: null, isPremium: false, totalItems: 0, storiesCount: 0, weekCreated: 0, weekPublished: 0 }
    expect(buildBraviChecklist(base).find(s => s.href === '/analisis')?.done).toBe(false)
    expect(buildBraviChecklist({ ...base, instagramConnected: true }).find(s => s.href === '/analisis')?.done).toBe(true)
  })
})
