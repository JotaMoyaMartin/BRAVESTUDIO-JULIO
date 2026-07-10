'use client'
import { useState } from 'react'
import { ContentItem } from '@/types/database'
import { formatContentForCopy } from '@/lib/content-utils'
import BraviGuide from '@/components/bravi/BraviGuide'
import { createClient } from '@/lib/supabase/client'
import { Check, Film, LayoutGrid, FileText, CheckCircle2, Circle, Copy } from 'lucide-react'

interface Props {
  items: ContentItem[]
}

export default function PlanContenidosClient({ items: initialItems }: Props) {
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [marking, setMarking] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const completed = items.filter(i => i.status === 'done').length
  const pending = items.length - completed

  async function toggleDone(itemId: string, currentStatus: string) {
    setMarking(itemId)
    const supabase = createClient()
    if (currentStatus === 'done') {
      await supabase
        .from('content_items')
        .update({ status: 'library', done_at: null })
        .eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'library', done_at: null } : i))
    } else {
      await supabase
        .from('content_items')
        .update({ status: 'done', done_at: new Date().toISOString() })
        .eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'done', done_at: new Date().toISOString() } : i))
    }
    setMarking(null)
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const typeIcons: Record<string, typeof Film> = {
    reel: Film,
    carrusel: LayoutGrid,
    story: FileText,
  }

  const typeLabels: Record<string, string> = {
    reel: 'Reel',
    carrusel: 'Carrusel',
    story: 'Story',
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BraviGuide section="crear-contenido" size={64} />
          <div>
            <h1 className="text-2xl font-bold title-shine">Plan de Contenidos</h1>
            <p className="mt-1 text-sm text-cherry-dark opacity-80">
              Tus guiones preparados por tu estilista BRÄVE.
            </p>
          </div>
        </div>
        <div
          className="rounded-[var(--radius-lg)] p-8 text-center bg-white shadow-soft"
          style={{ border: '1.5px solid var(--color-buttermilk)' }}
        >
          <div className="text-4xl mb-3 float-soft inline-block">🎬</div>
          <h3 className="text-xl font-bold text-cherry-dark mb-2">Tu plan de contenidos estará disponible pronto</h3>
          <p className="text-sm text-cherry-dark opacity-70 max-w-md mx-auto">
            Tu estilita está preparando tus guiones personalizados. Cuando estén listos, aparecerán aquí para que los grabes y vayas marcando como completados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BraviGuide section="crear-contenido" size={64} />
        <div>
          <h1 className="text-2xl font-bold title-shine">Plan de Contenidos</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-80">
            Tus guiones preparados por tu estilista BRÄVE.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-[var(--radius-md)] p-4 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Total</p>
          <p className="text-2xl font-bold text-cherry-dark mt-1">{items.length}</p>
        </div>
        <div className="flex-1 rounded-[var(--radius-md)] p-4 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-pastel-green)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Completados</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#2a8a4a' }}>{completed}</p>
        </div>
        <div className="flex-1 rounded-[var(--radius-md)] p-4 bg-white shadow-soft" style={{ border: '1.5px solid var(--color-pastel-blue)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Pendientes</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#2a5a6a' }}>{pending}</p>
        </div>
      </div>

      {/* Script cards */}
      <div className="space-y-4">
        {items.map(item => {
          const Icon = typeIcons[item.type] || FileText
          const isDone = item.status === 'done'
          const formattedText = formatContentForCopy(item, 'visual')
          return (
            <div
              key={item.id}
              className="rounded-[var(--radius-md)] p-5 bg-white shadow-soft"
              style={{
                border: isDone ? '2px solid var(--color-pastel-green)' : '1.5px solid var(--color-buttermilk)',
                opacity: isDone ? 0.75 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
                    style={{ background: isDone ? 'var(--color-pastel-green)' : 'var(--color-buttermilk)' }}
                  >
                    <Icon size={18} style={{ color: 'var(--color-cherry)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-cherry-dark">{item.title}</p>
                    {item.service && (
                      <p className="text-xs text-cherry-dark opacity-60">{item.service} · {typeLabels[item.type] || item.type}</p>
                    )}
                  </div>
                </div>
                {isDone && (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0"
                    style={{ background: 'var(--color-pastel-green)', color: '#1a3a2a' }}
                  >
                    <CheckCircle2 size={12} /> Completado
                  </span>
                )}
              </div>

              <div
                className="rounded-[var(--radius-sm)] p-4 mb-3 whitespace-pre-wrap text-sm leading-relaxed"
                style={{ background: 'var(--color-cream)', border: '1px solid rgba(255,241,181,0.5)', color: 'var(--color-ink)' }}
              >
                {formattedText}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleDone(item.id, item.status)}
                  disabled={marking === item.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                  style={{
                    background: isDone ? 'var(--color-buttermilk)' : 'var(--color-pastel-green)',
                    color: isDone ? 'var(--color-cherry-dark)' : '#1a3a2a',
                    opacity: marking === item.id ? 0.5 : 1,
                  }}
                >
                  {isDone ? <Circle size={14} /> : <CheckCircle2 size={14} />}
                  {isDone ? 'Marcar pendiente' : 'Marcar completado'}
                </button>
                <button
                  onClick={() => handleCopy(formattedText, item.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold btn-ghost"
                >
                  {copied === item.id ? <Check size={14} /> : <Copy size={14} />}
                  {copied === item.id ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}