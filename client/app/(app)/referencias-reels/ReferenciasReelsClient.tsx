'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, ExternalLink, Scissors, ListOrdered } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { ReelReference } from './demo-references'

interface Props {
  references: ReelReference[]
  isDemo?: boolean
}

// MOCK de la sección "Referencias" — continuará el POC /prueba-reels.
// El visor reutiliza el mismo embed oficial de IG del POC (se unifica al integrar).

type Source =
  | { kind: 'ig'; type: 'p' | 'reel'; code: string; url: string }
  | { kind: 'drive'; code: string; url: string }
  | { kind: 'video'; code: string; url: string }

function shortFromUrl(url: string): Source | null {
  url = url.trim()
  const ig = url.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)
  if (ig) return { kind: 'ig', type: ig[1] === 'p' ? 'p' : 'reel', code: ig[2], url }
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([A-Za-z0-9_-]{10,})/)
  if (drive) return { kind: 'drive', code: drive[1], url }
  if (/^https?:\/\/.+\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: 'video', code: url, url }
  return null
}

export default function ReferenciasReelsClient({ references, isDemo }: Props) {
  const toast = useToast()
  const [selected, setSelected] = useState<ReelReference | null>(null)
  const [filter, setFilter] = useState<string>('todas')

  const accounts = useMemo(
    () => ['todas', ...Array.from(new Set(references.map(r => r.account)))],
    [references]
  )
  const visible = useMemo(
    () => (filter === 'todas' ? references : references.filter(r => r.account === filter)),
    [references, filter]
  )

  function openRef(ref: ReelReference) {
    const src = shortFromUrl(ref.instagram_url)
    if (!src) {
      toast.show('Ese link de referencia no se reconoce todavía', 'info')
      return
    }
    setSelected(ref)
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark">
              Róbale las ideas a otros reels
            </h1>
            {isDemo && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}
              >
                Mock · prueba
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-ink opacity-75">
            Reels de otros que funcionan, abiertos dentro de la app. Pulsa una tarjeta para verla
            entera y saber exactamente <strong>qué copiar</strong>.
          </p>
        </div>
      </div>

      {/* Filtro por cuenta */}
      <div className="flex flex-wrap gap-2">
        {accounts.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              filter === a
                ? { background: 'var(--color-cherry)', color: 'white' }
                : {
                    background: 'white',
                    color: 'var(--color-cherry-dark)',
                    border: '1.5px solid rgba(122,24,50,0.15)',
                  }
            }
          >
            {a === 'todas' ? `Todas (${references.length})` : a}
          </button>
        ))}
      </div>

      {/* Grid de referencias */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {visible.map(reference => (
          <div
            key={reference.id}
            className="idea-card rounded-[var(--radius-md)] overflow-hidden bg-white flex flex-col cursor-pointer"
            style={{ border: '1.5px solid var(--color-buttermilk)', boxShadow: 'var(--shadow-soft)' }}
            onClick={() => openRef(reference)}
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-cream">
              <img src={reference.cover_image} alt={reference.title} className="w-full h-full object-cover" loading="lazy" />
              <span
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
              >
                {reference.account}
              </span>
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.92)' }}
                >
                  <Play size={20} className="text-cherry-dark ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
              <p className="font-semibold text-sm text-cherry-dark" style={{ lineHeight: 1.35 }}>
                {reference.title}
              </p>
              <p className="text-xs text-ink opacity-70" style={{ lineHeight: 1.4 }}>
                {reference.short_description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-auto pt-2 items-center" style={{ color: 'var(--color-cherry)' }}>
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Scissors size={12} /> Róbale esto
                </span>
                <span className="text-[11px] text-ink opacity-55 ml-auto">{reference.followers} seg</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Panel lateral con el reel abierto */}
      <AnimatePresence>
        {selected && <ReelPanel reference={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}

function ReelPanel({ reference, onClose }: { reference: ReelReference; onClose: () => void }) {
  const src = shortFromUrl(reference.instagram_url)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 right-0 z-50 w-full md:max-w-md bg-cream overflow-y-auto md:rounded-l-[var(--radius-lg)] rounded-t-[var(--radius-lg)]"
        style={{ boxShadow: 'var(--shadow-strong)' }}
      >
        {/* Visor: el reel se reproduce aquí mismo (embed oficial de IG) */}
        <div className="relative bg-cream pt-4 px-4 pb-2">
          {src && (
            <div
              className="rounded-[var(--radius-md)] overflow-hidden mx-auto bg-white relative"
              style={{ aspectRatio: '9 / 16.6', maxWidth: 420, border: '1.5px solid rgba(122,24,50,0.12)' }}
            >
              <iframe
                key={src.kind === 'ig' ? src.code : src.url}
                src={src.kind === 'ig' ? `https://www.instagram.com/${src.type}/${src.code}/embed` : src.url}
                title={reference.title}
                frameBorder={0}
                scrolling="no"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 shadow-medium z-10"
            aria-label="Cerrar"
          >
            <X size={18} className="text-cherry-dark" />
          </button>
        </div>

        {/* Contenido de la referencia */}
        <div className="p-5 md:p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--color-cherry)', color: 'white' }}
              >
                {reference.account}
              </span>
              <span className="text-[11px] text-ink opacity-60">
                {reference.accountLabel} · {reference.followers} seguidores
              </span>
            </div>
            <h2 className="text-xl font-bold text-cherry-dark mt-2" style={{ lineHeight: 1.3 }}>
              {reference.title}
            </h2>
            <p className="mt-2 text-sm text-ink opacity-80">{reference.short_description}</p>
          </div>

          <div className="rounded-[var(--radius-sm)] p-4" style={{ background: 'rgba(122,24,50,0.06)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-cherry)' }}>
              <ListOrdered size={13} /> Estructura
            </p>
            <ol className="space-y-1.5">
              {reference.structure.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--color-cherry-dark)', lineHeight: 1.45 }}>
                  <span className="font-bold" style={{ color: 'var(--color-cherry)' }}>{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div
            className="rounded-[var(--radius-sm)] p-4"
            style={{ background: 'rgba(193,219,232,0.25)', border: '1.5px solid rgba(74,122,138,0.2)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: '#2a5a6a' }}>
              <Scissors size={13} /> Róbale esto
            </p>
            <p className="text-sm" style={{ color: '#1a3a4a', lineHeight: 1.5 }}>{reference.steal}</p>
          </div>

          <a
            href={reference.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost w-full justify-center py-3"
          >
            <ExternalLink size={16} /> Ver Reel en Instagram
          </a>

          <Link
            href="/prueba-reels"
            className="text-xs text-center text-cherry opacity-60 hover:opacity-100 flex items-center justify-center gap-1"
          >
            O prueba a pegar otro link en el laboratorio
          </Link>
        </div>
      </motion.div>
    </>
  )
}