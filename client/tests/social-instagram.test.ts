import { describe, it, expect, afterAll } from 'vitest'
import {
  GraphApiError,
  isInsightlessError,
  mediaInsightsMetric,
  normalizeAccountInsights,
  normalizeMediaItem,
  parseMediaInsights,
} from '@/lib/social/instagram'

/** Tests de normalización del cliente Instagram (lógica pura, fixtures JSON). */

afterAll(() => {
  // instagram.ts no lee env al importar — nada que restaurar; por limpieza:
  delete process.env.INSTAGRAM_APP_ID
  delete process.env.INSTAGRAM_APP_SECRET
})

describe('mediaInsightsMetric — qué métricas se piden por tipo de pieza', () => {
  it('CAROUSEL_ALBUM → null (Meta responde 400 pidiendo insights de carrusel)', () => {
    expect(mediaInsightsMetric('CAROUSEL_ALBUM')).toBeNull()
  })

  it('REELS → incluye views y duración media', () => {
    const metrics = mediaInsightsMetric('REELS') ?? []
    expect(metrics).toContain('views')
    expect(metrics).toContain('ig_reels_avg_watch_time')
  })

  it('STORY → métricas de story activa (replies/visitas de perfil)', () => {
    const metrics = mediaInsightsMetric('STORY') ?? []
    expect(metrics).toContain('replies')
    expect(metrics).toContain('profile_visits')
  })

  it('IMAGE → métricas de feed (sin watch time)', () => {
    const metrics = mediaInsightsMetric('IMAGE') ?? []
    expect(metrics).toContain('reach')
    expect(metrics).not.toContain('ig_reels_avg_watch_time')
  })
})

describe('parseMediaInsights — respuesta /{id}/insights → métricas', () => {
  it('REELS completo: views, reach, likes y avgWatchTime en ms', () => {
    const raw = {
      data: [
        { name: 'views', values: [{ value: 1200 }] },
        { name: 'reach', values: [{ value: 940 }] },
        { name: 'likes', values: [{ value: 45 }] },
        { name: 'ig_reels_avg_watch_time', values: [{ value: 8200 }] },
      ],
    }
    const metrics = parseMediaInsights(raw)
    expect(metrics.views).toBe(1200)
    expect(metrics.reach).toBe(940)
    expect(metrics.likes).toBe(45)
    expect(metrics.avgWatchTimeMs).toBe(8200)
  })

  it('respuestas raras → objeto vacío, nunca lanza', () => {
    expect(parseMediaInsights(null)).toEqual({})
    expect(parseMediaInsights({})).toEqual({})
    expect(parseMediaInsights({ data: 'no-es-array' })).toEqual({})
  })

  it('valores no numéricos se ignoran (no se meten NaN en la DB)', () => {
    const raw = { data: [{ name: 'views', values: [{ value: 'no-numero' }] }] }
    expect(parseMediaInsights(raw)).toEqual({})
  })
})

describe('isInsightlessError — métrica con < 5 viewers y piezas caducadas', () => {
  it('code 10 (menos de 5 cuentas alcanzadas) → null silencioso, no error grave', () => {
    expect(isInsightlessError(new GraphApiError('Insufficient views', 10, 400))).toBe(true)
  })
  it('stories 9007 / 4007 → null silencioso', () => {
    expect(isInsightlessError(new GraphApiError('gone', 9007, 404))).toBe(true)
    expect(isInsightlessError(new GraphApiError('gone', 4007, 404))).toBe(true)
  })
  it('otros errores de la Graph API → error real (la sync lo registra)', () => {
    expect(isInsightlessError(new GraphApiError('boom', 2, 500))).toBe(false)
  })
  it('errores que no son de la Graph API → error real', () => {
    expect(isInsightlessError(new Error('normal'))).toBe(false)
  })
})

describe('normalizeAccountInsights — series diarias de /me/insights', () => {
  // Fixture fiel a la Graph API: follower_count viene como serie de values[];
  // follows_and_unfollows llega en DOS entradas con title Follows/Unfollows.
  const fixture = {
    data: [
      {
        name: 'follower_count',
        values: [
          { value: 1000, end_time: '2026-10-01T00:00:00+0000' },
          { value: 1010, end_time: '2026-10-02T00:00:00+0000' },
        ],
      },
      {
        name: 'views',
        values: [{ value: 500, end_time: '2026-10-02T00:00:00+0000' }],
      },
      {
        name: 'total_interactions',
        values: [{ value: 33, end_time: '2026-10-01T00:00:00+0000' }],
      },
      {
        name: 'follows_and_unfollows',
        title: 'Follows',
        values: [{ value: 12, end_time: '2026-10-02T00:00:00+0000' }],
      },
      {
        name: 'follows_and_unfollows',
        title: 'Unfollows',
        values: [{ value: 3, end_time: '2026-10-02T00:00:00+0000' }],
      },
    ],
  }

  it('fusiona todas las series por día y ordena ascendente', () => {
    const points = normalizeAccountInsights(fixture)
    expect(points.map(p => p.date)).toEqual(['2026-10-01', '2026-10-02'])
  })

  it('días a los que no llega una métrica quedan null (no 0)', () => {
    const points = normalizeAccountInsights(fixture)
    expect(points[0].views).toBeNull()
    expect(points[0].totalInteractions).toBe(33)
    expect(points[0].followers).toBe(1000)
    // día 2 completo
    expect(points[1].followers).toBe(1010)
    expect(points[1].views).toBe(500)
    expect(points[1].follows).toBe(12)
    expect(points[1].unfollows).toBe(3)
    expect(points[1].profileLinksTaps).toBeNull()
    expect(points[0].follows).toBeNull()
  })

  it('cuerpos vacíos → array vacío (la route responde sin romperse)', () => {
    expect(normalizeAccountInsights(null)).toEqual([])
    expect(normalizeAccountInsights({ data: [] })).toEqual([])
  })
})

describe('normalizeMediaItem — fila de /me/media → snapshot (sin insights)', () => {
  const row = {
    id: '17956904882374901',
    caption: 'Nuevo balayage en el salón ✨',
    media_type: 'IMAGE',
    media_product_type: 'FEED',
    timestamp: '2026-09-30T10:00:00+0000',
    permalink: 'https://www.instagram.com/p/abc/',
    like_count: 7,
    comments_count: 2,
  }

  it('mapea los campos de la ficha (like/comment ya vienen aquí)', () => {
    const snapshot = normalizeMediaItem(row)
    expect(snapshot).not.toBeNull()
    expect(snapshot!.providerMediaId).toBe('17956904882374901')
    expect(snapshot!.mediaType).toBe('IMAGE')
    expect(snapshot!.mediaProductType).toBe('FEED')
    expect(snapshot!.caption).toBe('Nuevo balayage en el salón ✨')
    expect(snapshot!.postedAt).toBe('2026-09-30T10:00:00+0000')
    expect(snapshot!.metrics).toEqual({ likes: 7, comments: 2 })
  })

  it('filas sin thumbnail_url → null, sin romper', () => {
    expect(normalizeMediaItem(row)!.thumbnailUrl).toBeNull()
  })

  it('fila sin id → null (no hay pieza que guardar)', () => {
    expect(normalizeMediaItem({ media_type: 'IMAGE' })).toBeNull()
  })

  it('IMAGE sin insights → métricas básicas y snapshot listo', () => {
    const snapshot = normalizeMediaItem({ ...row, like_count: undefined, comments_count: undefined })
    expect(snapshot!.metrics).toEqual({})
  })

  it('insights se FUNDEN sobre las métricas base (likes base + reach de insights)', () => {
    const snapshot = normalizeMediaItem(row, { views: 999, reach: 800 })
    expect(snapshot!.metrics!.likes).toBe(7)
    expect(snapshot!.metrics!.views).toBe(999)
    expect(snapshot!.metrics!.reach).toBe(800)
  })

  it('story activa: productType forzado a STORY (carrera /me/stories)', () => {
    const story = normalizeMediaItem(
      { id: 'story-1', media_type: 'IMAGE' },
      null,
      'STORY',
    )
    expect(story!.mediaProductType).toBe('STORY')
  })
})

describe('authorizeUrl — URL de consentimiento de Instagram', () => {
  afterAll(() => {
    delete process.env.INSTAGRAM_APP_ID
    delete process.env.INSTAGRAM_APP_SECRET
  })

  it('contiene client_id, redirect_uri, state y scopes de la app', async () => {
    process.env.INSTAGRAM_APP_ID = 'ig-app-test'
    process.env.INSTAGRAM_APP_SECRET = 'ig-secret-test'
    const mod = await import('@/lib/social/instagram')
    const client = new mod.InstagramProviderClient()
    const url = client.authorizeUrl('state-123', 'https://bravestudio.app/api/social/oauth/callback')
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://www.instagram.com')
    expect(parsed.pathname).toBe('/oauth/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('ig-app-test')
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://bravestudio.app/api/social/oauth/callback')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('state')).toBe('state-123')
    expect(parsed.searchParams.get('scope')).toBe('instagram_business_basic,instagram_business_manage_insights')
  })
})