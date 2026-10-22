'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutTemplate, AlertTriangle, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import BraviGuide from '@/components/bravi/BraviGuide'
import { DesignTemplate, DesignKind, kindAspect, kindLabel, parseTemplateList } from '@/lib/design'
import { DEMO_TEMPLATES } from '@/lib/design-demo'

/**
 * DISEÑOS — galería de plantillas con tabs (Carrusel / Story),
 * filtros por categoría y plantillas demo cuando no hay reales.
 *
 * La clienta nunca ve Canva: elige plantilla → /disenos/[id] para
 * personalizar textos y foto → Generar → PNGs por página.
 */

type LoadState = 'loading' | 'ready' | 'error'
type KindTab = 'all' | DesignKind

export default function DisenosClient() {
  const [state, setState] = useState<LoadState>('loading')
  const [realTemplates, setRealTemplates] = useState<DesignTemplate[]>([])
  const [kindTab, setKindTab] = useState<KindTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch('/api/design/templates')
      if (!res.ok) throw new Error(String(res.status))
      const parsed = parseTemplateList(await res.json())
      if (!parsed) throw new Error('payload-inválido')
      setRealTemplates(parsed)
      setState('ready')
    } catch {
      setRealTemplates([])
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Si no hay plantillas reales → mostrar demos
  const templates = useMemo(() => {
    return realTemplates.length > 0 ? realTemplates : DEMO_TEMPLATES
  }, [realTemplates])

  const isDemo = realTemplates.length === 0 && state === 'ready'

  // Categorías disponibles
  const categories = useMemo(() => {
    const cats = [...new Set(templates.map(t => t.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [templates])

  // Filtrar por tab + categoría
  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (kindTab !== 'all' && t.kind !== kindTab) return false
      if (categoryFilter && t.category !== categoryFilter) return false
      return true
    })
  }, [templates, kindTab, categoryFilter])

  // Contadores por tab
  const countAll = templates.length
  const countCarousel = templates.filter(t => t.kind === 'carousel').length
  const countStory = templates.filter(t => t.kind === 'story').length

  return (
    <div className="max-w-3xl space-y-5">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">Diseños</h1>
          <p className="mt-2 text-sm text-ink opacity-75 max-w-xl">
            Elige una plantilla, personaliza los textos con IA y descárgala lista para publicar.
          </p>
        </div>
        <BraviGuide section="disenos" size={56} />
      </div>

      {state === 'loading' && <GallerySkeleton />}

      {state === 'error' && (
        <Card className="text-center py-10 px-6">
          <div className="flex justify-center mb-3">
            <span className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center bg-buttermilk">
              <AlertTriangle size={24} className="text-cherry" />
            </span>
          </div>
          <p className="font-bold text-cherry-dark">No se han podido cargar las plantillas</p>
          <p className="mt-1 text-sm text-cherry-dark opacity-70">
            Comprueba tu conexión y vuelve a intentarlo.
          </p>
          <div className="flex justify-center mt-4">
            <Button variant="secondary" size="sm" onClick={load}>Reintentar</Button>
          </div>
        </Card>
      )}

      {state === 'ready' && (
        <>
          {/* Badge demo */}
          {isDemo && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 bg-[rgba(122,24,50,0.06)]">
              <Sparkles size={16} className="text-cherry flex-shrink-0" />
              <p className="text-xs text-cherry-dark opacity-75">
                Plantillas de ejemplo — cuando el equipo publique las tuyas, aparecerán aquí automáticamente.
              </p>
            </div>
          )}

          {/* Tabs: Todo / Carruseles / Stories */}
          <div className="flex gap-2">
            {([
              { id: 'all' as KindTab, label: 'Todos', count: countAll },
              { id: 'carousel' as KindTab, label: 'Carruseles', count: countCarousel },
              { id: 'story' as KindTab, label: 'Stories', count: countStory },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setKindTab(tab.id); setCategoryFilter(null) }}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all"
                style={
                  kindTab === tab.id
                    ? { background: 'var(--color-cherry)', color: 'white', boxShadow: 'var(--shadow-medium)' }
                    : { background: 'white', border: '1.5px solid var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }
                }
              >
                {tab.label}
                <span className="ml-1.5 opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Filtros por categoría */}
          {categories.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter(null)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={
                  !categoryFilter
                    ? { background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }
                    : { background: 'transparent', color: 'var(--color-cherry-dark)', opacity: 0.6 }
                }
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                  style={
                    categoryFilter === cat
                      ? { background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }
                      : { background: 'transparent', color: 'var(--color-cherry-dark)', opacity: 0.6 }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Galería */}
          {filtered.length === 0 ? (
            <Card className="text-center py-10 px-6">
              <p className="font-bold text-cherry-dark">No hay plantillas en esta categoría</p>
              <p className="mt-1 text-sm text-cherry-dark opacity-70">
                Prueba con otro filtro o espera a que el equipo publique más.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {filtered.map(t => (
                <Link
                  key={t.id}
                  href={`/disenos/${t.id}`}
                  className="block group"
                  aria-label={`Abrir plantilla ${t.name}`}
                >
                  <Card padding="none" interactive className="overflow-hidden">
                    {/* Preview */}
                    <div className="bg-cream relative" style={{ aspectRatio: kindAspect(t.kind, t) }}>
                      {t.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.previewUrl}
                          alt={t.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutTemplate size={28} className="text-cherry opacity-30" />
                        </div>
                      )}
                      {/* Badge de páginas */}
                      {t.pageCount > 1 && (
                        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {t.pageCount} pág.
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-bold text-cherry-dark leading-tight line-clamp-2">
                        {t.name}
                      </p>

                      {/* Miniaturas de páginas */}
                      {(t.previewUrls?.length ?? 0) > 1 && (
                        <div className="flex gap-1 mt-2 overflow-hidden">
                          {t.previewUrls!.slice(1, 5).map((u, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={u}
                              alt={`${t.name} página ${i + 2}`}
                              loading="lazy"
                              className="h-10 rounded-[var(--radius-sm)] border border-soft object-cover"
                            />
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Badge tone={t.kind === 'story' ? 'blue' : 'buttermilk'}>
                          {kindLabel(t.kind)}
                        </Badge>
                        {t.category && (
                          <Badge tone="neutral">{t.category}</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-soft bg-white overflow-hidden animate-pulse">
          <div className="bg-warm-gray" style={{ aspectRatio: i % 2 === 0 ? '4 / 5' : '3 / 2' }} />
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 rounded bg-warm-gray" />
            <div className="h-5 w-16 rounded-full bg-warm-gray" />
          </div>
        </div>
      ))}
    </div>
  )
}
