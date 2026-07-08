'use client'
import { useState, useMemo } from 'react'
import { Search, Filter, Check, Copy, BookOpen, X, Film, LayoutGrid, MessageSquare, Clapperboard, Trash2, ArrowRight, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ContentItem, BrandProfile, ReelInspiration } from '@/types/database'
import ContentCard from '@/components/content/ContentCard'
import BraviMascot from '@/components/bravi/BraviMascot'
import { formatMultipleForCopy, copyToClipboard } from '@/lib/content-utils'

type PartialBrand = Pick<BrandProfile, 'optimized_summary' | 'salon_name' | 'main_services' | 'service_to_promote'> | null

type FilterType = 'all' | 'reel' | 'carrusel' | 'story' | 'inspiraciones' | 'reto-10k'

const FILTER_OPTIONS: { id: FilterType; label: string; icon: typeof Film | null }[] = [
  { id: 'all', label: 'Todos', icon: null },
  { id: 'reel', label: 'Reels', icon: Film },
  { id: 'carrusel', label: 'Carruseles', icon: LayoutGrid },
  { id: 'story', label: 'Stories', icon: MessageSquare },
  { id: 'reto-10k', label: 'Reto 10K', icon: Rocket },
  { id: 'inspiraciones', label: 'Inspiraciones', icon: Clapperboard },
]

export default function BibliotecaClient({ userId, items, brandContext, savedInspirations }: { userId: string; items: ContentItem[]; brandContext: PartialBrand; savedInspirations: ReelInspiration[] }) {
  const isDemoMode = userId === 'demo'
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [inspirations, setInspirations] = useState<ReelInspiration[]>(savedInspirations)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  const filtered = useMemo(() => {
    let result = items
    if (filter !== 'all' && filter !== 'inspiraciones' && filter !== 'reto-10k') {
      result = result.filter(i => i.type === filter)
    }
    if (filter === 'reto-10k') {
      result = result.filter(i => i.tag === 'reto-10k')
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(i => (i.title || '').toLowerCase().includes(q))
    }
    return result
  }, [items, filter, search])

  function handleDateChange() {
    setRefreshKey(k => k + 1)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function cancelMultiSelect() {
    setMultiSelect(false)
    clearSelection()
  }

  function copySelection() {
    const selectedItems = items.filter(i => selectedIds.has(i.id))
    if (selectedItems.length === 0) return
    copyToClipboard(formatMultipleForCopy(selectedItems))
  }

  async function removeSavedInspiration(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('saved_inspirations').delete().eq('user_id', userId).eq('inspiration_id', id)
    if (!error) {
      setInspirations(prev => prev.filter(i => i.id !== id))
    }
  }

  async function handleClearAll() {
    setClearing(true)
    try {
      const supabase = createClient()
      // Borrar todo el contenido guardado por la usuaria
      const { error: cErr } = await supabase.from('content_items').delete().eq('user_id', userId)
      if (cErr) throw cErr
      // Borrar también las inspiraciones guardadas para dejar todo a cero
      const { error: iErr } = await supabase.from('saved_inspirations').delete().eq('user_id', userId)
      if (iErr) throw iErr
      setInspirations([])
      setConfirmingClear(false)
      setRefreshKey(k => k + 1)
      router.refresh()
    } catch (e) {
      console.error('Error al vaciar biblioteca:', e)
    } finally {
      setClearing(false)
    }
  }

  if (items.length === 0 && inspirations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Biblioteca</h1>
          <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>
            Todo tu contenido guardado en un solo lugar
          </p>
        </div>

        <div className="rounded-3xl p-12 text-center" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
          <BraviMascot size={120} />
          <p className="font-semibold text-lg mt-4" style={{ color: '#1a1a1a' }}>Aún no tienes contenido guardado</p>
          <p className="text-sm mt-2" style={{ color: '#591427', opacity: 0.7 }}>
            Crea algo desde Planificación, Crear Contenido o Stories BRÄVE.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link href="/planificar" className="btn-primary text-sm py-2.5 px-5">
              <BookOpen size={16} /> Ir a Planificación
            </Link>
            <Link href="/crear-contenido" className="btn-secondary text-sm py-2.5 px-5">
              <Film size={16} /> Crear Contenido
            </Link>
            <Link href="/stories" className="btn-ghost text-sm py-2.5 px-5">
              <MessageSquare size={16} /> Stories BRÄVE
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Biblioteca</h1>
          <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>
            Todo tu contenido guardado en un solo lugar
          </p>
        </div>
        {!multiSelect && items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmingClear(true)}
              disabled={isDemoMode}
              className="btn-ghost text-sm py-2 px-4"
              style={{ color: 'var(--color-cherry)', opacity: isDemoMode ? 0.4 : 1 }}
              title={isDemoMode ? 'Disponible en modo completo' : 'Borrar todo el contenido guardado'}
            >
              <Trash2 size={15} /> Vaciar biblioteca
            </button>
            <button onClick={() => setMultiSelect(true)} className="btn-ghost text-sm py-2 px-4">
              <Check size={15} /> Seleccionar varios
            </button>
          </div>
        )}
      </div>

      {/* Confirmación vaciar biblioteca */}
      {confirmingClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(89,20,39,0.4)' }}
          onClick={() => !clearing && setConfirmingClear(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-[var(--radius-md)] p-6 max-w-sm w-full text-center"
            style={{ background: 'var(--color-cream)', border: '1.5px solid var(--color-cherry)' }}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#fde8e8' }}>
              <Trash2 size={22} style={{ color: 'var(--color-cherry)' }} />
            </div>
            <h3 className="font-bold text-base text-cherry-dark mb-1">¿Vaciar toda la biblioteca?</h3>
            <p className="text-xs text-cherry-dark opacity-70 mb-5">
              Se borrarán <strong>todos</strong> los contenidos e inspiraciones guardadas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setConfirmingClear(false)}
                disabled={clearing}
                className="btn-ghost text-sm py-2.5 px-5"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white py-2.5 px-5 rounded-[var(--radius-sm)]"
                style={{ background: 'var(--color-cherry)', opacity: clearing ? 0.65 : 1 }}
              >
                <Trash2 size={14} /> {clearing ? 'Vaciando...' : 'Sí, vaciar todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-select bar */}
      {multiSelect && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl" style={{ background: '#FFF1B5', border: '1.5px solid rgba(122,24,50,0.12)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: '#591427' }}>
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copySelection}
              disabled={selectedIds.size === 0}
              className="btn-primary text-xs py-2 px-4"
              style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}
            >
              <Copy size={14} /> Copiar selección
            </button>
            <button onClick={cancelMultiSelect} className="btn-ghost text-xs py-2 px-4">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 p-1 rounded-2xl overflow-x-auto no-scrollbar" style={{ background: '#F5F0E8' }}>
          {FILTER_OPTIONS.map(opt => {
            const Icon = opt.icon
            const count = opt.id === 'all'
              ? items.length
              : opt.id === 'inspiraciones'
                ? inspirations.length
                : opt.id === 'reto-10k'
                  ? items.filter(i => i.tag === 'reto-10k').length
                  : items.filter(i => i.type === opt.id).length
            return (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: filter === opt.id ? '#7A1832' : 'transparent',
                  color: filter === opt.id ? 'white' : '#591427',
                  opacity: count === 0 && opt.id !== 'all' ? 0.4 : 1,
                }}
              >
                {Icon && <Icon size={14} />}
                {opt.label}{count > 0 && ` (${count})`}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} style={{ color: '#591427', opacity: 0.5, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-56"
              style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5' }}
            />
          </div>
        </div>
      </div>

      {/* Item count */}
      <p className="text-sm" style={{ color: '#591427', opacity: 0.6 }}>
        {filtered.length} elemento{filtered.length !== 1 ? 's' : ''}
        {filter !== 'all' && ` · filtrado por ${FILTER_OPTIONS.find(f => f.id === filter)?.label.toLowerCase()}`}
        {search.trim() && ` · búsqueda: "${search.trim()}"`}
      </p>

      {/* List view */}
      {filter === 'inspiraciones' ? (
        inspirations.length === 0 ? (
          <div className="rounded-3xl p-12 text-center" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
            <Clapperboard size={40} style={{ color: '#591427', opacity: 0.3, margin: '0 auto' }} />
            <p className="font-semibold mt-4" style={{ color: '#1a1a1a' }}>Aún no tienes inspiraciones guardadas</p>
            <p className="text-sm mt-1" style={{ color: '#591427', opacity: 0.7 }}>
              Explora la galería y guarda las ideas que quieras adaptar.
            </p>
            <Link href="/inspiracion-reels" className="btn-primary text-sm py-2.5 px-5 inline-flex mt-5">
              <Clapperboard size={16} /> Explorar inspiración
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
            {inspirations.map(insp => (
              <div
                key={insp.id}
                className="rounded-[var(--radius-md)] overflow-hidden bg-white flex flex-col"
                style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
              >
                <div className="relative aspect-[9/16] overflow-hidden bg-cream">
                  <img src={insp.cover_image} alt={insp.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
                  <p className="font-semibold text-sm text-cherry-dark" style={{ lineHeight: 1.35 }}>{insp.title}</p>
                  <p className="text-xs text-ink opacity-70" style={{ lineHeight: 1.4 }}>{insp.short_description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    <button
                      onClick={() => router.push('/inspiracion-reels')}
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold btn-secondary flex items-center justify-center gap-1"
                    >
                      Ver <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => removeSavedInspiration(insp.id)}
                      className="px-2.5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all"
                      style={{ background: 'var(--color-warm-gray)', color: 'var(--color-cherry)' }}
                      title="Quitar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl p-12 text-center" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
          <Filter size={40} style={{ color: '#591427', opacity: 0.3, margin: '0 auto' }} />
          <p className="font-semibold mt-4" style={{ color: '#1a1a1a' }}>No hay contenido que coincida</p>
          <p className="text-sm mt-1" style={{ color: '#591427', opacity: 0.7 }}>
            Prueba a cambiar los filtros o la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-3" key={refreshKey}>
          {filtered.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              userId={userId}
              isDemoMode={isDemoMode}
              selectable={multiSelect}
              selected={selectedIds.has(item.id)}
              onSelect={toggleSelect}
              onDateChange={handleDateChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}