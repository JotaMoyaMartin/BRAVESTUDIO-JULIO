'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutTemplate, AlertTriangle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { DesignTemplate, kindAspect, kindLabel, parseTemplateList } from '@/lib/design'

/**
 * DISEÑOS — galería de plantillas de marca publicadas por el equipo BRÄVE.
 * La clienta nunca ve Canva: elige plantilla → /disenos/[id] para
 * personalizar textos y foto → Generar → PNGs por página.
 * La lista llega de GET /api/design/templates (contrato fijo).
 */

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

export default function DisenosClient() {
  const [state, setState] = useState<LoadState>('loading')
  const [templates, setTemplates] = useState<DesignTemplate[]>([])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch('/api/design/templates')
      if (!res.ok) throw new Error(String(res.status))
      const parsed = parseTemplateList(await res.json())
      if (!parsed) throw new Error('payload-inválido')
      setTemplates(parsed)
      setState(parsed.length === 0 ? 'empty' : 'ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-3xl space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">Diseños</h1>
        <p className="mt-2 text-sm text-ink opacity-75 max-w-xl">
          Plantillas de tu marca, listas para personalizar
        </p>
      </div>

      {state === 'loading' && <GallerySkeleton />}

      {state === 'empty' && (
        <Card className="text-center py-10 px-6">
          <div className="flex justify-center mb-3">
            <span className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center bg-buttermilk">
              <LayoutTemplate size={24} className="text-cherry" />
            </span>
          </div>
          <p className="font-bold text-cherry-dark">Aún no hay plantillas publicadas</p>
          <p className="mt-1 text-sm text-cherry-dark opacity-70" style={{ lineHeight: 1.6 }}>
            El equipo ya está subiendo las plantillas de tu marca. Vuelve a entrar en un rato.
          </p>
        </Card>
      )}

      {state === 'error' && (
        <Card className="text-center py-10 px-6">
          <div className="flex justify-center mb-3">
            <span className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center bg-buttermilk">
              <AlertTriangle size={24} className="text-cherry" />
            </span>
          </div>
          <p className="font-bold text-cherry-dark">No se han podido cargar las plantillas</p>
          <p className="mt-1 text-sm text-cherry-dark opacity-70" style={{ lineHeight: 1.6 }}>
            Comprueba tu conexión y vuelve a intentarlo.
          </p>
          <div className="flex justify-center mt-4">
            <Button variant="secondary" size="sm" onClick={load}>Reintentar</Button>
          </div>
        </Card>
      )}

      {state === 'ready' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {templates.map(t => (
            <Link key={t.id} href={`/disenos/${t.id}`} className="block group" aria-label={`Abrir plantilla ${t.name}`}>
              <Card padding="none" interactive className="overflow-hidden">
                <div className="bg-cream" style={{ aspectRatio: kindAspect(t.kind) }}>
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
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-cherry-dark leading-tight line-clamp-2">{t.name}</p>
                  <div className="mt-2">
                    <Badge tone={t.kind === 'story' ? 'blue' : 'buttermilk'}>{kindLabel(t.kind)}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/** Esqueleto simple de la galería mientras carga. */
function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
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