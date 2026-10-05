'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Copy, Check, ChevronLeft, Zap, Wand2, Sparkles, Star,
  BookOpen, Captions, RefreshCw, Clock,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { saveToLibrary } from '@/lib/content-utils'
import { useSessionState } from '@/lib/session-store'
import { createClient } from '@/lib/supabase/client'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import {
  GANCHO_CATEGORY_META, GANCHOS, GanchoCategoryId, ganchoId, allGanchos,
  GanchoCategoryId as CatId,
} from '@/lib/ganchos'
import {
  generateGanchoGuionChecked, generateGanchoVariations, GanchoGuionOutput,
} from '@/lib/ai/prompts/ganchos'
import { buildBrandFullContext, hasBrandContext, BrandFullContextInput } from '@/lib/ai/brand-context'
import { openTeleprompter, composeReelSpokenScript } from '@/lib/teleprompter/input'

interface Props {
  userId: string
  brandFull: BrandFullContextInput | null
  recentHooks: string[]
  /** Favoritos ya guardados (server en modo real; [] en demo — se hidrata de localStorage). */
  initialFavs: string[]
}

type PanelMode = 'usar' | 'guion'
/** Vistas de la sección: overview ('cats') → categoría o favoritos. */
type SectionView = 'cats' | 'favs' | CatId

interface GanchoItem {
  id: string
  categoryId: GanchoCategoryId
  index: number
  text: string
}

// ─── Icono por categoría (lucide) ───────────────────────────────
const CATEGORY_ICONS: Record<GanchoCategoryId, typeof Zap> = {
  instantaneos: Zap,
  consejos: Sparkles,
  principiantes: Wand2,
  narrativa: BookOpen,
}

// ─── Favoritos en demo (localStorage, hidratación post-mount) ───
const FAV_KEY = 'brave_ganchos_fav'
function loadDemoFavs(): string[] {
  try {
    const raw = window.localStorage.getItem(FAV_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
function saveDemoFavs(ids: string[]) {
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(ids))
  } catch { /* storage lleno: no crítico */ }
}

/** Resuelve ids de favoritos contra el banco estático (unknown → fuera). */
function resolveFavs(ids: string[]): GanchoItem[] {
  const byId = new Map(allGanchos().map(g => [g.id, g]))
  return ids.map(id => byId.get(id)).filter((g): g is GanchoItem => !!g)
}

// ─── Vista de la sección ────────────────────────────────────────
// Flujo (definición de Jota): categoría → gancho → Usar gancho / Generar guion.
// Con estrella para favoritos (persisten en saved_ganchos) + sección Favoritos.
export default function BancoGanchosClient({ userId, brandFull, recentHooks, initialFavs }: Props) {
  const toast = useToast()
  const isDemoMode = userId === 'demo'
  const hasBrand = hasBrandContext(brandFull)
  const [useMiMarca, setUseMiMarca] = useSessionState<boolean>(
    `u:${userId}:banco-ganchos:useMiMarca`, hasBrand
  )

  const brandContext = useMemo(() => {
    if (!useMiMarca || !brandFull) return undefined
    return buildBrandFullContext(brandFull) || undefined
  }, [useMiMarca, brandFull])

  const [view, setView] = useState<SectionView>('cats')
  const [selected, setSelected] = useState<GanchoItem | null>(null)

  // Favoritos (estrella). Demo: localStorage post-mount; real: estado del server + CRUD.
  const [favIds, setFavIds] = useState<string[]>(initialFavs)
  const [favBusy, setFavBusy] = useState<string | null>(null)
  useEffect(() => {
    if (isDemoMode) setFavIds(loadDemoFavs())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode])

  async function toggleFav(g: GanchoItem) {
    if (favBusy) return
    const isFav = favIds.includes(g.id)
    setFavBusy(g.id)
    if (isDemoMode) {
      const next = isFav ? favIds.filter(x => x !== g.id) : [...favIds, g.id]
      setFavIds(next)
      saveDemoFavs(next)
      setFavBusy(null)
      toast.show(isFav ? 'Quitada de tus favoritos' : 'Guardada en tus favoritos', isFav ? 'info' : 'success')
      return
    }
    const supabase = createClient()
    if (isFav) {
      const { error } = await supabase.from('saved_ganchos').delete().eq('user_id', userId).eq('gancho_id', g.id)
      if (!error) {
        setFavIds(prev => prev.filter(x => x !== g.id))
        toast.show('Quitada de tus favoritos', 'info')
      }
    } else {
      const { error } = await supabase.from('saved_ganchos').insert({
        user_id: userId, gancho_id: g.id, category_id: g.categoryId, text: g.text,
      })
      if (!error) {
        setFavIds(prev => [...prev, g.id])
        toast.show('Guardada en tus favoritos', 'success')
      }
    }
    setFavBusy(null)
  }

  const ganchosOf = (cat: CatId): GanchoItem[] =>
    GANCHOS[cat].map((text, i) => ({ id: ganchoId(cat, i), categoryId: cat, index: i + 1, text }))

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">Banco de Ganchos</h1>
        <p className="mt-2 text-sm text-ink opacity-75">
          Los 80 ganchos de Jota, en 4 intenciones. Nunca más “no sé de qué hablar”:
          elige un gancho y tu vídeo empieza casi solo.
        </p>
      </div>

      <UsarMiMarcaToggle enabled={useMiMarca} onChange={setUseMiMarca} hasBrand={hasBrand} />

      {view === 'cats' ? (
        /* ── Paso 1: favoritos + categorías (intenciones) ── */
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 mb-3">
            ¿Qué necesita tu vídeo de hoy?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Favoritos — siempre a mano arriba (petición Jota, 5-oct) */}
            <button
              onClick={() => setView('favs')}
              className="idea-card md:col-span-2 rounded-[var(--radius-md)] p-4 text-left flex items-center gap-3 transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
            >
              <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(122,24,50,0.10)' }}>
                <Star size={17} style={{ color: '#b8860b' }} fill="currentColor" />
              </span>
              <p className="font-bold text-cherry-dark">Mis favoritos</p>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry)' }}>
                {favIds.length} ganchos
              </span>
            </button>

            {GANCHO_CATEGORY_META.map(meta => {
              const Icon = CATEGORY_ICONS[meta.id]
              return (
                <button
                  key={meta.id}
                  onClick={() => setView(meta.id)}
                  className="idea-card rounded-[var(--radius-md)] p-5 text-left flex flex-col gap-2 bg-white transition-transform hover:-translate-y-0.5"
                  style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-buttermilk)' }}>
                      <Icon size={17} className="text-cherry-dark" />
                    </span>
                    <p className="font-bold text-cherry-dark">{meta.name}</p>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(122,24,50,0.08)', color: 'var(--color-cherry)' }}>
                      20 ganchos
                    </span>
                  </div>
                  <p className="text-sm text-ink opacity-75" style={{ lineHeight: 1.45 }}>
                    {meta.objective}
                  </p>
                  <p className="text-xs text-cherry font-semibold flex items-center gap-1.5 mt-auto pt-2">
                    <Sparkles size={12} /> {meta.hook}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ) : view === 'favs' ? (
        /* ── Paso 2 (favoritos): solo los estrellados ── */
        <FavoritosView
          favs={resolveFavs(favIds)}
          onBack={() => setView('cats')}
          onOpen={(g) => setSelected(g)}
          onToggleFav={toggleFav}
          favIds={favIds}
          favBusy={favBusy}
        />
      ) : (
        /* ── Paso 2: ganchos de la categoría ── */
        <GanchosCategory
          categoryId={view}
          onBack={() => setView('cats')}
          onOpen={(g) => setSelected(g)}
          ganchos={ganchosOf(view)}
          favIds={favIds}
          favBusy={favBusy}
          onToggleFav={toggleFav}
        />
      )}

      {/* Panel del gancho */}
      <AnimatePresence>
        {selected && (
          <GanchoPanel
            gancho={selected}
            onClose={() => setSelected(null)}
            brandContext={brandContext}
            recentHooks={recentHooks}
            isDemoMode={isDemoMode}
            userId={userId}
            isFav={favIds.includes(selected.id)}
            onToggleFav={() => toggleFav(selected)}
            favBusy={favBusy === selected.id}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Botón estrella reutilizable (favoritos) ────────────────────
function FavStar({
  isFav, busy, onClick, size = 16,
}: {
  isFav: boolean
  busy?: boolean
  onClick: () => void
  size?: number
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={busy}
      className="p-1.5 rounded-full transition-all hover:scale-110 flex-shrink-0"
      style={{
        background: isFav ? 'rgba(255, 200, 0, 0.18)' : 'rgba(122,24,50,0.06)',
        opacity: busy ? 0.5 : 1,
      }}
      title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      <Star
        size={size}
        fill={isFav ? 'currentColor' : 'none'}
        style={{ color: isFav ? '#e8a800' : 'var(--color-cherry)' }}
      />
    </button>
  )
}

// ─── Lista de ganchos de una categoría ──────────────────────────
function GanchosCategory({
  categoryId, onBack, onOpen, ganchos, favIds, favBusy, onToggleFav,
}: {
  categoryId: CatId
  onBack: () => void
  onOpen: (g: GanchoItem) => void
  ganchos: GanchoItem[]
  favIds: string[]
  favBusy: string | null
  onToggleFav: (g: GanchoItem) => void
}) {
  const meta = GANCHO_CATEGORY_META.find(c => c.id === categoryId)!
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-cherry hover:opacity-75 transition-opacity">
        <ChevronLeft size={16} /> Todas las categorías
      </button>

      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'rgba(122,24,50,0.06)' }}>
        <p className="font-semibold text-sm text-cherry-dark">{meta.name}</p>
        <p className="text-xs text-ink opacity-70 mt-1">{meta.pattern}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {ganchos.map(g => {
          const isFav = favIds.includes(g.id)
          return (
            <div
              key={g.id}
              onClick={() => onOpen(g)}
              className="idea-card rounded-[var(--radius-md)] p-4 text-left flex items-start gap-3 bg-white transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{ border: isFav ? '1.5px solid rgba(232,168,0,0.45)' : '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
            >
              <span className="text-xs font-bold text-cherry opacity-60 pt-0.5 flex-shrink-0" style={{ minWidth: 22 }}>
                {String(g.index).padStart(2, '0')}
              </span>
              <span className="flex-1">
                <span className="text-sm font-semibold text-cherry-dark block" style={{ lineHeight: 1.4 }}>
                  {g.text}
                </span>
                <span className="text-xs text-cherry font-bold inline-flex items-center gap-1.5 mt-2">
                  <Wand2 size={12} /> Usar este gancho
                </span>
              </span>
              <FavStar
                isFav={isFav}
                busy={favBusy === g.id}
                onClick={() => onToggleFav(g)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vista de favoritos ─────────────────────────────────────────
function FavoritosView({
  favs, onBack, onOpen, onToggleFav, favIds, favBusy,
}: {
  favs: GanchoItem[]
  onBack: () => void
  onOpen: (g: GanchoItem) => void
  onToggleFav: (g: GanchoItem) => void
  favIds: string[]
  favBusy: string | null
}) {
  const countByCat = (cat: GanchoCategoryId) => favs.filter(f => f.categoryId === cat).length
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-cherry hover:opacity-75 transition-opacity">
        <ChevronLeft size={16} /> Todas las categorías
      </button>

      {favs.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-8 text-center space-y-2" style={{ background: 'rgba(122,24,50,0.04)' }}>
          <span className="inline-flex w-11 h-11 rounded-full items-center justify-center" style={{ background: 'var(--color-buttermilk)' }}>
            <Star size={20} style={{ color: '#b8860b' }} fill="currentColor" />
          </span>
          <p className="font-semibold text-cherry-dark">Aún no tienes favoritos</p>
          <p className="text-sm text-ink opacity-70" style={{ lineHeight: 1.45 }}>
            Toca la <Star size={12} className="inline -mt-1" style={{ color: '#e8a800' }} /> de cualquier gancho
            y te quedará aquí guardado para cuando lo necesites.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'rgba(122,24,50,0.06)' }}>
            <p className="font-semibold text-sm text-cherry-dark">Tus {favs.length} favoritos</p>
            <p className="text-xs text-ink opacity-70 mt-1">
              {GANCHO_CATEGORY_META.map(c => `${c.name} ${countByCat(c.id)}`).join(' · ')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {favs.map(g => {
              const meta = GANCHO_CATEGORY_META.find(c => c.id === g.categoryId)!
              return (
                <div
                  key={g.id}
                  onClick={() => onOpen(g)}
                  className="idea-card rounded-[var(--radius-md)] p-4 text-left flex items-start gap-3 bg-white transition-transform hover:-translate-y-0.5 cursor-pointer"
                  style={{ border: '1.5px solid rgba(232,168,0,0.45)', boxShadow: 'var(--shadow-soft)' }}
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 flex-shrink-0"
                    style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
                  >
                    {meta.name}
                  </span>
                  <span className="flex-1">
                    <span className="text-sm font-semibold text-cherry-dark block" style={{ lineHeight: 1.4 }}>
                      {g.text}
                    </span>
                    <span className="text-xs text-cherry font-bold inline-flex items-center gap-1.5 mt-2">
                      <Wand2 size={12} /> Usar este gancho
                    </span>
                  </span>
                  <FavStar
                    isFav={favIds.includes(g.id)}
                    busy={favBusy === g.id}
                    onClick={() => onToggleFav(g)}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Panel lateral del gancho (drawer derecho, patrón Referencias) ──
function GanchoPanel({
  gancho, onClose, brandContext, recentHooks, userId, isDemoMode, isFav, onToggleFav, favBusy,
}: {
  gancho: GanchoItem
  onClose: () => void
  brandContext: string | undefined
  recentHooks: string[]
  userId: string
  isDemoMode: boolean
  isFav: boolean
  onToggleFav: () => void
  favBusy: boolean
}) {
  const toast = useToast()
  const meta = GANCHO_CATEGORY_META.find(c => c.id === gancho.categoryId)!
  const [tab, setTab] = useState<PanelMode>('usar')

  // "Usar gancho" — copiar / editar / variación IA / guardar en biblioteca
  const [text, setText] = useState(gancho.text)
  const [copied, setCopied] = useState(false)
  const [variations, setVariations] = useState<string[] | null>(null)
  const [variationsMock, setVariationsMock] = useState(false)
  const [variationsLoading, setVariationsLoading] = useState(false)
  const [hookBiblioteca, setHookBiblioteca] = useState(false)

  // "Generar guion" — reel completo del gancho
  const [guion, setGuion] = useState<GanchoGuionOutput | null>(null)
  const [guionMock, setGuionMock] = useState(false)
  const [guionLoading, setGuionLoading] = useState(false)
  const [genTick, setGenTick] = useState(0)
  const [saved, setSaved] = useState(false)

  async function copyGancho() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
      toast.show('Gancho copiado — pégalo en tus notas o en el editor', 'success')
    } catch {
      toast.show('Tu navegador no dejo copiar: selecciona el texto a mano', 'info')
    }
  }

  async function makeVariations() {
    setVariationsLoading(true)
    const res = await generateGanchoVariations({
      gancho: text.trim() || gancho.text,
      categoryId: gancho.categoryId,
      brandContext,
    })
    setVariations(res.variants)
    setVariationsMock(res.mock)
    setVariationsLoading(false)
    if (res.mock) toast.show('IA no disponible ahora mismo — te dejo una variación de ejemplo', 'info')
  }

  async function makeGuion() {
    setGuionLoading(true)
    // Cada generación rota el ángulo del desarrollo — 2 guiones del mismo
    // gancho nunca salen gemelos (petición Jota 5-oct: "todos parecidos").
    const tick = genTick + 1
    setGenTick(tick)
    // Genera SIEMPRE desde el texto actual (si lo adaptaste a tu servicio, así sale).
    const res = await generateGanchoGuionChecked({
      gancho: text.trim() || gancho.text,
      categoryId: gancho.categoryId,
      brandContext,
      avoidHooks: recentHooks,
    }, { seed: tick })
    setGuion(res.reel)
    setGuionMock(res.mock)
    setSaved(false)
    setGuionLoading(false)
  }

  // Objective estándar de la categoría (lo usa cualquier guardado a biblioteca).
  const objectiveByCat: Record<GanchoCategoryId, string> = {
    instantaneos: 'visibilidad',
    consejos: 'consejos',
    principiantes: 'educativo',
    narrativa: 'autoridad',
  }

  /** Guarda el gancho (adaptado) en Biblioteca — ítem con el gancho como guion
   *  brevísimo; la usuaria completa con "Generar guion" si lo quiere entero. */
  async function saveHookToLibrary() {
    const hookText = text.trim() || gancho.text
    const item = {
      title: hookText.slice(0, 80),
      coverText: hookText.split(/\s+/).slice(0, 8).join(' '),
      script: { hook: hookText, context: '', solution: '', cta: '' },
      visualIdea: '',
      captionWithHashtags: '',
    }
    try {
      await saveToLibrary(userId, {
        type: 'reel',
        title: item.title,
        service: 'General',
        objective: objectiveByCat[gancho.categoryId],
        content_json: item as unknown as Record<string, unknown>,
        caption_with_hashtags: null,
        visual_idea: null,
        status: 'library' as const,
        format: 'reel',
        scheduled_date: null,
      }, isDemoMode)
      setHookBiblioteca(true)
      toast.show('Gancho guardado en tu Biblioteca', 'success')
    } catch {
      toast.show('No se pudo guardar — inténtalo de nuevo', 'info')
    }
  }

  async function saveGuion() {
    if (!guion) return
    try {
      await saveToLibrary(userId, {
        type: 'reel',
        title: guion.title,
        service: 'General',
        objective: objectiveByCat[gancho.categoryId],
        content_json: guion as unknown as Record<string, unknown>,
        caption_with_hashtags: guion.captionWithHashtags || null,
        visual_idea: guion.visualIdea || null,
        status: 'library' as const,
        format: 'reel',
        scheduled_date: null,
      }, isDemoMode)
      setSaved(true)
      toast.show('Guion guardado en tu Biblioteca', 'success')
    } catch {
      toast.show('No se pudo guardar — inténtalo de nuevo', 'info')
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 right-0 z-50 w-full md:max-w-md bg-cream overflow-y-auto md:rounded-l-[var(--radius-lg)] rounded-t-[var(--radius-lg)]"
        style={{ boxShadow: 'var(--shadow-strong)' }}
      >
        <div className="relative pt-5 px-5 pb-3">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 shadow-medium z-10"
            aria-label="Cerrar"
          >
            <X size={18} className="text-cherry-dark" />
          </button>
          {/* Favorito también desde el panel (petición Jota, 5-oct) */}
          <span className="absolute top-4 right-14 z-10">
            <FavStar isFav={isFav} busy={favBusy} onClick={onToggleFav} />
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-cherry)', color: 'white' }}>
            {meta.name} · #{gancho.index}
          </span>
          <h2 className="text-lg font-bold text-cherry-dark mt-2 pr-20" style={{ lineHeight: 1.35 }}>
            {gancho.text}
          </h2>
        </div>

        {/* Cambio de modo */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTab('usar')}
              className="px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition-all"
              style={tab === 'usar'
                ? { background: 'var(--color-cherry)', color: 'white' }
                : { background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }}
            >
              <Copy size={14} className="inline -mt-0.5 mr-1.5" /> Usar gancho
            </button>
            <button
              onClick={() => { setTab('guion'); if (!guion && !guionLoading) makeGuion() }}
              className="px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition-all"
              style={tab === 'guion'
                ? { background: 'var(--color-cherry)', color: 'white' }
                : { background: 'white', color: 'var(--color-cherry-dark)', border: '1.5px solid rgba(122,24,50,0.15)' }}
            >
              <Wand2 size={14} className="inline -mt-0.5 mr-1.5" /> Generar guion
            </button>
          </div>
        </div>

        {/* ── MODO USAR GANCHO ── */}
        {tab === 'usar' && (
          <div className="px-5 pb-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cherry opacity-70 mb-2">
                Adáptalo a tu servicio
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full rounded-[var(--radius-sm)] p-3 text-sm bg-white outline-none resize-none"
                style={{ border: '1.5px solid rgba(122,24,50,0.18)', color: 'var(--color-cherry-dark)', lineHeight: 1.5 }}
                placeholder="Escribe tu gancho para hoy..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={copyGancho} variant="primary" icon={copied ? <Check size={16} /> : <Copy size={16} />}>
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button onClick={saveHookToLibrary} variant="secondary" disabled={hookBiblioteca} icon={hookBiblioteca ? <Check size={16} /> : <BookOpen size={16} />}>
                {hookBiblioteca ? 'Guardado' : 'A Biblioteca'}
              </Button>
            </div>

            <div className="rounded-[var(--radius-md)] p-4 space-y-3" style={{ background: 'rgba(193,219,232,0.25)' }}>
              <div>
                <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#2a5a6a' }}>
                  <Sparkles size={13} /> Variación con IA
                </p>
                <p className="text-xs text-ink opacity-70 mt-1" style={{ lineHeight: 1.4 }}>
                  El gancho es un patrón: BRÄVE lo reescribe para tu salón sin repetirse.
                </p>
              </div>
              <Button
                onClick={makeVariations}
                variant="ghost"
                size="sm"
                loading={variationsLoading}
                icon={<RefreshCw size={13} />}
              >
                {variations ? 'Más variaciones' : 'Generar variaciones'}
              </Button>
              {variations && (
                <div className="space-y-2">
                  {variations.map((v, i) => (
                    <button
                      key={`${gancho.id}-v${i}`}
                      onClick={() => { setText(v); toast.show('Variación colocada — puedes editarla antes de copiar', 'success') }}
                      className="w-full text-left rounded-[var(--radius-sm)] p-3 text-sm bg-white transition-transform hover:-translate-y-0.5"
                      style={{ border: '1.5px solid rgba(74,122,138,0.25)', color: 'var(--color-cherry-dark)', lineHeight: 1.45 }}
                    >
                      {v}
                    </button>
                  ))}
                  {variationsMock && (
                    <p className="text-[11px] text-ink opacity-55 flex items-center gap-1">
                      <Clock size={11} /> Modo ejemplo (IA sin conexión)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODO GENERAR GUION ── */}
        {tab === 'guion' && (
          <div className="px-5 pb-6 space-y-4">
            {guionLoading && (
              <div className="rounded-[var(--radius-md)] p-6 text-center space-y-3" style={{ background: 'rgba(122,24,50,0.06)' }}>
                <span className="inline-block w-8 h-8 border-2 border-cherry border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-cherry-dark">Escribiendo tu guion...</p>
                <p className="text-xs text-ink opacity-60">Gancho → Contexto → Desarrollo → CTA</p>
              </div>
            )}
            {!guionLoading && !guion && (
              <div className="rounded-[var(--radius-md)] p-6 text-center space-y-3" style={{ background: 'rgba(122,24,50,0.06)' }}>
                <p className="text-sm text-cherry-dark font-semibold">Tu reel completo a partir de este gancho</p>
                <Button onClick={() => makeGuion()} icon={<Wand2 size={15} />}>Generar guion</Button>
              </div>
            )}
            {!guionLoading && guion && (
              <div className="space-y-3">
                {guionMock && (
                  <p className="text-[11px] text-ink opacity-60 flex items-center gap-1">
                    <Clock size={11} /> Ejemplo de guion (IA sin conexión) — puedes regenerar en otro momento.
                  </p>
                )}
                <div className="rounded-[var(--radius-md)] bg-white overflow-hidden" style={{ border: '1.5px solid var(--color-buttermilk)' }}>
                  <div className="p-4" style={{ background: 'var(--color-cherry)', color: 'white' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Tu reel</p>
                    <p className="font-bold text-sm mt-1" style={{ lineHeight: 1.35 }}>{guion.title}</p>
                    <p className="text-xs mt-2 px-2 py-1 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.18)' }}>
                      {guion.coverText}
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <GuionBlock label="Gancho" text={guion.script.hook} cherry />
                    <GuionBlock label="Contexto" text={guion.script.context} />
                    <GuionBlock label="Desarrollo / Solución" text={guion.script.solution} />
                    <GuionBlock label="CTA" text={guion.script.cta} cherry />
                    <GuionBlock label="Idea visual" text={guion.visualIdea} />
                  </div>
                </div>

                <div className="rounded-[var(--radius-sm)] p-4" style={{ background: 'rgba(122,24,50,0.06)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-cherry">Copy para Instagram</p>
                  <p className="text-xs text-cherry-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {guion.captionWithHashtags}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button onClick={saveGuion} variant="primary" disabled={saved} icon={saved ? <Check size={16} /> : <BookOpen size={16} />}>
                    {saved ? 'Guardado en Biblioteca' : 'Guardar en Biblioteca'}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        if (!guion) return
                        navigator.clipboard?.writeText(
                          `${guion.script.hook}\n${guion.script.context}\n${guion.script.solution}\n${guion.script.cta}`
                        ).then(() => toast.show('Guion copiado al portapapeles', 'success')).catch(() => {})
                      }}
                      variant="ghost" size="sm" icon={<Copy size={13} />}
                    >
                      Copiar guion
                    </Button>
                    <Button onClick={() => makeGuion()} variant="ghost" size="sm" icon={<RefreshCw size={13} />}>
                      Otro ángulo
                    </Button>
                  </div>
                  <TeleprompterButton guion={guion} />
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </>
  )
}

function GuionBlock({ label, text, cherry }: { label: string; text: string; cherry?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: cherry ? 'var(--color-cherry)' : 'rgba(42,90,106,1)' }}>
        {label}
      </p>
      <p className="text-sm" style={{ color: 'var(--color-cherry-dark)', lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

function TeleprompterButton({ guion }: { guion: GanchoGuionOutput }) {
  const router = useRouter()
  return (
    <Button
      variant="secondary"
      icon={<Captions size={16} />}
      onClick={() => {
        if (!guion) return
        openTeleprompter(
          {
            script: composeReelSpokenScript(guion.script),
            title: guion.title,
            source: 'reel',
            returnUrl: '/banco-ganchos',
          },
          router
        )
      }}
    >
      Abrir en Teleprompter
    </Button>
  )
}