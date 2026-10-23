'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Copy, Check, ChevronLeft, ChevronRight, ArrowRight, Zap, Wand2, Sparkles, Star,
  BookOpen, Captions, RefreshCw, Search, Shuffle,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { saveToLibrary } from '@/lib/content-utils'
import { useSessionState } from '@/lib/session-store'
import { createClient } from '@/lib/supabase/client'
import UsarMiMarcaToggle from '@/components/ui/UsarMiMarcaToggle'
import AIUnavailableNotice from '@/components/ui/AIUnavailableNotice'
import {
  GANCHO_CATEGORY_META, GANCHOS, GanchoCategoryId, ganchoId, allGanchos, ganchoCategoryName,
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

  // Buscador en los 80 ganchos (sin tildes ni mayúsculas).
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (q.length < 2) return null
    return allGanchos().filter(g => normalize(g.text).includes(q))
  }, [query])

  async function copyHook(g: GanchoItem) {
    try {
      await navigator.clipboard.writeText(g.text)
      toast.show('Gancho copiado', 'success')
    } catch {
      toast.show('Tu navegador no dejó copiar: abre el gancho y selecciónalo a mano', 'info')
    }
  }

  const listProps = {
    favIds, favBusy, onToggleFav: toggleFav, onOpen: (g: GanchoItem) => setSelected(g), onCopy: copyHook,
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Cabecera */}
      <div className="max-w-2xl">
        <h1 className="text-[28px] md:text-[40px] font-extrabold text-cherry-dark leading-[1.05]" style={{ letterSpacing: '-1px' }}>
          Banco de Ganchos
        </h1>
        <p className="mt-2 text-[15px] text-tinta-2" style={{ lineHeight: 1.5 }}>
          80 frases probadas para los 3 primeros segundos de tu reel. Elige una, adáptala a tu salón y graba.
        </p>
      </div>

      <UsarMiMarcaToggle enabled={useMiMarca} onChange={setUseMiMarca} hasBrand={hasBrand} />

      {view === 'cats' ? (
        <div className="space-y-6 md:space-y-8">
          {/* Buscador */}
          <label className="relative block">
            <span className="sr-only">Buscar un gancho</span>
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cherry opacity-60" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Busca por palabra: rubio, canas, error, clienta…"
              className="w-full rounded-full bg-white pl-11 pr-4 py-3.5 text-[15px] text-ink outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(122,24,50,0.18)]"
              style={{ border: '1.5px solid var(--color-borde)' }}
            />
          </label>

          {results ? (
            <section aria-live="polite" className="space-y-3">
              <p className="text-sm font-semibold text-cherry-dark">
                {results.length === 0
                  ? `Ningún gancho tiene «${query.trim()}». Prueba con otra palabra.`
                  : `${results.length} ${results.length === 1 ? 'gancho' : 'ganchos'} con «${query.trim()}»`}
              </p>
              <HookList ganchos={results} showCategory {...listProps} />
            </section>
          ) : (
            <>
              <HookSpotlight onOpen={g => setSelected(g)} onCopy={copyHook} />

              {/* Las 4 intenciones como portadas de reel */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-cherry-dark">¿Qué quieres conseguir con tu vídeo?</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {GANCHO_CATEGORY_META.map(meta => (
                    <CategoryCover key={meta.id} meta={meta} sample={GANCHOS[meta.id][0]} onClick={() => setView(meta.id)} />
                  ))}
                </div>
              </section>

              {/* Favoritos */}
              <button
                onClick={() => setView('favs')}
                className="w-full rounded-[var(--radius-md)] px-5 py-4 text-left flex items-center gap-3 bg-white transition-transform hover:-translate-y-0.5"
                style={{ border: '1.5px solid var(--color-borde)', boxShadow: 'var(--shadow-soft)' }}
              >
                <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-mantequilla)' }}>
                  <Star size={18} style={{ color: '#b8860b' }} fill="currentColor" aria-hidden />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-cherry-dark">Mis favoritos</span>
                  <span className="block text-sm text-tinta-2">
                    {favIds.length === 0 ? 'Marca con la estrella los que más te gusten' : `${favIds.length} ${favIds.length === 1 ? 'gancho guardado' : 'ganchos guardados'}`}
                  </span>
                </span>
                <ChevronRight size={18} className="text-cherry flex-shrink-0" aria-hidden />
              </button>
            </>
          )}
        </div>
      ) : view === 'favs' ? (
        <FavoritosView favs={resolveFavs(favIds)} onBack={() => setView('cats')} {...listProps} />
      ) : (
        <GanchosCategory categoryId={view} onBack={() => setView('cats')} ganchos={ganchosOf(view)} {...listProps} />
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

/** Quita tildes y mayúsculas para buscar. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// ─── Color de cada intención (mismo en portada, cabecera y etiqueta) ──
const CATEGORY_STYLE: Record<GanchoCategoryId, { bg: string; fg: string; soft: string; chip: string }> = {
  instantaneos: { bg: 'var(--color-cereza)', fg: '#FFFFFF', soft: 'rgba(255,255,255,0.78)', chip: 'rgba(255,255,255,0.16)' },
  consejos: { bg: 'var(--color-mantequilla)', fg: 'var(--color-burdeos)', soft: 'rgba(89,20,39,0.72)', chip: 'rgba(122,24,50,0.10)' },
  principiantes: { bg: 'var(--color-rosa)', fg: 'var(--color-burdeos)', soft: 'rgba(89,20,39,0.72)', chip: 'rgba(122,24,50,0.10)' },
  narrativa: { bg: 'var(--color-burdeos)', fg: 'var(--color-mantequilla)', soft: 'rgba(255,241,181,0.78)', chip: 'rgba(255,241,181,0.14)' },
}

/** Portada de categoría: un gancho real en grande, como el texto de un reel. */
function CategoryCover({ meta, sample, onClick }: { meta: (typeof GANCHO_CATEGORY_META)[number]; sample: string; onClick: () => void }) {
  const Icon = CATEGORY_ICONS[meta.id]
  const st = CATEGORY_STYLE[meta.id]
  return (
    <button
      onClick={onClick}
      className="group relative min-h-[232px] lg:min-h-0 lg:aspect-[4/5] rounded-[var(--radius-lg)] p-4 md:p-5 text-left flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cherry"
      style={{ background: st.bg, color: st.fg, boxShadow: 'var(--shadow-medium)' }}
    >
      <span className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: st.chip }}>
          <Icon size={15} aria-hidden />
        </span>
        <span className="text-[11px] font-bold" style={{ color: st.soft }}>20 ganchos</span>
      </span>
      <span
        className="mt-4 mb-auto block font-extrabold text-[15px] md:text-[17px] leading-[1.2] line-clamp-4"
        style={{ letterSpacing: '-0.3px' }}
      >
        «{sample}»
      </span>
      <span className="mt-3 pt-3 flex items-end justify-between gap-2" style={{ borderTop: `1px solid ${st.chip}` }}>
        <span className="min-w-0">
          <span className="block font-bold text-[14px] md:text-[15px] leading-tight">{meta.name}</span>
          <span className="hidden sm:block text-xs mt-0.5 leading-snug" style={{ color: st.soft }}>{meta.hook}</span>
        </span>
        <ArrowRight size={16} className="flex-shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
    </button>
  )
}

/** Gancho del día: uno distinto cada día (estable al recargar) + «Otro». */
function HookSpotlight({ onOpen, onCopy }: { onOpen: (g: GanchoItem) => void; onCopy: (g: GanchoItem) => void }) {
  const all = useMemo(() => allGanchos(), [])
  const [idx, setIdx] = useState<number | null>(null)
  useEffect(() => {
    const d = new Date()
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
    setIdx((dayOfYear * 7) % all.length)
  }, [all.length])
  const g = idx === null ? null : all[idx]
  const meta = g ? GANCHO_CATEGORY_META.find(c => c.id === g.categoryId)! : null

  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] p-5 md:p-8"
      style={{ background: 'linear-gradient(140deg, var(--color-burdeos) 0%, var(--color-cereza) 100%)', color: 'white', boxShadow: 'var(--shadow-strong)' }}
      aria-label="Gancho del día"
    >
      <div className="relative z-[1] max-w-xl min-h-[170px] flex flex-col">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-mantequilla)' }}>
          Gancho del día{meta ? ` · ${meta.name}` : ''}
        </p>
        <AnimatePresence mode="wait">
          {g && (
            <motion.p
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="mt-3 text-[22px] md:text-[30px] font-extrabold leading-[1.15]"
              style={{ letterSpacing: '-0.6px' }}
            >
              «{g.text}»
            </motion.p>
          )}
        </AnimatePresence>
        <div className="mt-auto pt-5 flex flex-wrap gap-2">
          <button
            onClick={() => g && onOpen(g)}
            disabled={!g}
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--color-mantequilla)', color: 'var(--color-burdeos)' }}
          >
            <Wand2 size={16} aria-hidden /> Usar este gancho
          </button>
          <button
            onClick={() => g && onCopy(g)}
            disabled={!g}
            className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}
          >
            <Copy size={15} aria-hidden /> Copiar
          </button>
          <button
            onClick={() => setIdx(i => (i === null ? 0 : (i + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length))}
            className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}
          >
            <Shuffle size={15} aria-hidden /> Otro
          </button>
        </div>
      </div>
      {/* Marco de móvil decorativo: el gancho vive en pantalla */}
      <div
        aria-hidden
        className="hidden md:block absolute -right-6 top-6 w-[180px] aspect-[9/16] rounded-[28px]"
        style={{ border: '6px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', transform: 'rotate(8deg)' }}
      >
        <div className="absolute left-4 right-4 top-1/3 h-3 rounded-full" style={{ background: 'rgba(255,241,181,0.5)' }} />
        <div className="absolute left-4 right-10 top-[calc(33%+20px)] h-3 rounded-full" style={{ background: 'rgba(255,241,181,0.32)' }} />
      </div>
    </section>
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
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
      style={{
        background: isFav ? 'rgba(255, 200, 0, 0.18)' : 'rgba(122,24,50,0.06)',
        opacity: busy ? 0.5 : 1,
      }}
      title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-pressed={isFav}
    >
      <Star
        size={size}
        fill={isFav ? 'currentColor' : 'none'}
        style={{ color: isFav ? '#e8a800' : 'var(--color-cherry)' }}
      />
    </button>
  )
}

interface HookListProps {
  ganchos: GanchoItem[]
  favIds: string[]
  favBusy: string | null
  onToggleFav: (g: GanchoItem) => void
  onOpen: (g: GanchoItem) => void
  onCopy: (g: GanchoItem) => void
  showCategory?: boolean
}

/** Lista de ganchos: frase grande + acciones a un toque (usar, copiar, estrella). */
function HookList({ ganchos, favIds, favBusy, onToggleFav, onOpen, onCopy, showCategory = false }: HookListProps) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {ganchos.map(g => {
        const isFav = favIds.includes(g.id)
        const st = CATEGORY_STYLE[g.categoryId]
        return (
          <li
            key={g.id}
            className="rounded-[var(--radius-md)] bg-white p-4 md:p-5 flex flex-col gap-3"
            style={{ border: isFav ? '1.5px solid rgba(232,168,0,0.5)' : '1.5px solid var(--color-borde)', boxShadow: 'var(--shadow-soft)' }}
          >
            <div className="flex items-start gap-3">
              {showCategory ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: st.bg, color: st.fg }}>
                  {ganchoCategoryName(g.categoryId)}
                </span>
              ) : (
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: st.bg, color: st.fg }}
                  aria-label={`Gancho ${g.index}`}
                >
                  {g.index}
                </span>
              )}
              <button
                onClick={() => onOpen(g)}
                className="flex-1 text-left text-[16px] md:text-[17px] font-bold text-cherry-dark hover:text-cherry transition-colors"
                style={{ lineHeight: 1.35, letterSpacing: '-0.2px' }}
              >
                {g.text}
              </button>
              <FavStar isFav={isFav} busy={favBusy === g.id} onClick={() => onToggleFav(g)} />
            </div>
            <div className="flex flex-wrap gap-2 pl-11">
              <button
                onClick={() => onOpen(g)}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold bg-cherry text-white hover:bg-cherry-dark transition-colors"
              >
                <Wand2 size={13} aria-hidden /> Usar gancho
              </button>
              <button
                onClick={() => onCopy(g)}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-cherry-dark hover:brightness-95 transition"
                style={{ background: 'var(--color-mantequilla)' }}
              >
                <Copy size={13} aria-hidden /> Copiar
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-cherry hover:opacity-75 transition-opacity">
      <ChevronLeft size={16} aria-hidden /> Todas las categorías
    </button>
  )
}

// ─── Lista de ganchos de una categoría ──────────────────────────
function GanchosCategory({
  categoryId, onBack, ganchos, ...listProps
}: Omit<HookListProps, 'showCategory'> & { categoryId: CatId; onBack: () => void }) {
  const meta = GANCHO_CATEGORY_META.find(c => c.id === categoryId)!
  const st = CATEGORY_STYLE[categoryId]
  const Icon = CATEGORY_ICONS[categoryId]
  return (
    <div className="space-y-4">
      <BackLink onBack={onBack} />
      <header className="rounded-[var(--radius-lg)] p-5 md:p-7" style={{ background: st.bg, color: st.fg, boxShadow: 'var(--shadow-medium)' }}>
        <span className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: st.soft }}>
          <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: st.chip }}>
            <Icon size={15} aria-hidden />
          </span>
          20 ganchos
        </span>
        <h2 className="mt-3 text-[26px] md:text-[34px] font-extrabold leading-[1.05]" style={{ letterSpacing: '-0.8px' }}>{meta.name}</h2>
        <p className="mt-2 text-[15px]" style={{ color: st.soft, lineHeight: 1.45 }}>{meta.objective}</p>
        <p className="mt-4 inline-block rounded-2xl px-4 py-2.5 text-sm font-semibold" style={{ background: st.chip }}>
          Fórmula: «{meta.pattern}»
        </p>
      </header>
      <HookList ganchos={ganchos} {...listProps} />
    </div>
  )
}

// ─── Vista de favoritos ─────────────────────────────────────────
function FavoritosView({
  favs, onBack, ...listProps
}: Omit<HookListProps, 'showCategory' | 'ganchos'> & { favs: GanchoItem[]; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <BackLink onBack={onBack} />
      <header>
        <h2 className="text-[26px] md:text-[34px] font-extrabold text-cherry-dark leading-[1.05]" style={{ letterSpacing: '-0.8px' }}>Mis favoritos</h2>
        <p className="mt-1 text-[15px] text-tinta-2">
          {favs.length === 0 ? 'Aquí se guardan los ganchos que marques con la estrella.' : `${favs.length} ${favs.length === 1 ? 'gancho guardado' : 'ganchos guardados'}`}
        </p>
      </header>
      {favs.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-8 text-center space-y-3" style={{ background: 'var(--color-warm-gray)' }}>
          <span className="inline-flex w-12 h-12 rounded-full items-center justify-center" style={{ background: 'var(--color-mantequilla)' }}>
            <Star size={22} style={{ color: '#b8860b' }} fill="currentColor" aria-hidden />
          </span>
          <p className="font-semibold text-cherry-dark">Aún no tienes favoritos</p>
          <p className="text-sm text-tinta-2" style={{ lineHeight: 1.45 }}>
            Toca la estrella de cualquier gancho y lo tendrás aquí cuando lo necesites.
          </p>
          <button onClick={onBack} className="btn-primary text-sm">Ver los 80 ganchos</button>
        </div>
      ) : (
        <HookList ganchos={favs} showCategory {...listProps} />
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
                  {variationsMock && (
                    <AIUnavailableNotice demo={isDemoMode} onRetry={makeVariations} retrying={variationsLoading} />
                  )}
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
                  <AIUnavailableNotice demo={isDemoMode} onRetry={() => makeGuion()} retrying={guionLoading} />
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