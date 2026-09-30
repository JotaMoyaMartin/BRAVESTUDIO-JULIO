'use client'
import { useState } from 'react'
import { FlaskConical, ExternalLink, PlayCircle } from 'lucide-react'

type Item = { id: string; title: string; cover_image: string; instagram_url: string | null }

type Source =
  | { kind: 'ig'; type: 'p' | 'reel'; code: string; url: string }
  | { kind: 'drive'; code: string; url: string }
  | { kind: 'video'; code: string; url: string }

/** POC — Laboratorio: ver reels DENTRO de la app.
 *  Acepta: link de reel/post de Instagram (embed oficial), link de Google Drive
 *  (reproductor preview) o un mp4 directo. Lo que Jota pega se reproduce aquí. */

function shortFromUrl(url: string): Source | null {
  url = url.trim()
  const ig = url.match(/instagram\.com\/(?:[A-Za-z0-9_.]*\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)
  if (ig) return { kind: 'ig', type: ig[1] === 'p' ? 'p' : 'reel', code: ig[2], url } as Source
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([A-Za-z0-9_-]{10,})/)
  if (drive) return { kind: 'drive', code: drive[1], url } as Source
  if (/^https?:\/\/.+\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: 'video', code: url, url } as Source
  return null
}

function VideoSource({ src }: { src: Source }) {
  if (src.kind === 'video') {
    return <video key={src.url} src={src.url} controls playsInline className="rounded-[var(--radius-md)] max-h-[72vh] mx-auto" />
  }
  const embedSrc =
    src.kind === 'ig'
      ? `https://www.instagram.com/${src.type}/${src.code}/embed`
      : `https://drive.google.com/file/d/${src.code}/preview`
  return (
    <div
      className="rounded-[var(--radius-md)] overflow-hidden mx-auto bg-white relative"
      style={{
        aspectRatio: src.kind === 'ig' ? '9 / 16.6' : '16 / 10',
        maxWidth: 420,
        maxHeight: '80vh',
        border: '1.5px solid rgba(122,24,50,0.12)',
      }}
    >
      <iframe
        key={embedSrc}
        src={embedSrc}
        title="Reel"
        frameBorder={0}
        scrolling="no"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}

export default function PruebaReelsClient({
  inspirations,
  transitions,
  initialVideoUrl,
}: {
  inspirations: Item[]
  transitions: Item[]
  initialVideoUrl: string | null
}) {
  const [current, setCurrent] = useState<Source | null>(() =>
    initialVideoUrl ? shortFromUrl(initialVideoUrl) : null
  )
  const [pasted, setPasted] = useState('')
  const [err, setErr] = useState<string | null>(null)

  function open(url: string) {
    const src = shortFromUrl(url) as Source | null
    if (!src) {
      setErr('No reconozco ese link. Pega un link de un reel de Instagram, de Google Drive o un .mp4.')
      return
    }
    setErr(null)
    setCurrent(src)
  }

  const items = [...inspirations.map(i => ({ ...i, from: 'Referencias' })), ...transitions.map(t => ({ ...t, from: 'Transiciones' }))]
    .filter(i => !!i.instagram_url)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink" style={{ letterSpacing: '-0.5px' }}>
          Prueba: reels dentro de la app <FlaskConical size={20} className="inline text-cherry" />
        </h1>
        <p className="mt-1 text-base text-cherry-dark opacity-80">
          Los vídeos se reproducen aquí — no sales de la aplicación.
        </p>
      </div>

      {/* Player */}
      {current ? (
        <div>
          <VideoSource src={current} />
          {current.kind !== 'video' && (
            <p className="text-center">
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cherry-dark opacity-60 hover:opacity-100 mt-2"
              >
                <ExternalLink size={12} />{' '}
                {current.kind === 'ig'
                  ? 'Ver en Instagram por si el embed pide login (a veces pasa en Europa)'
                  : 'Abrir el original'}
              </a>
            </p>
          )}
        </div>
      ) : (
        <div
          className="rounded-[var(--radius-md)] p-8 text-center flex flex-col items-center gap-2"
          style={{ background: 'var(--color-buttermilk)', border: '1.5px dashed rgba(122,24,50,0.25)' }}
        >
          <PlayCircle size={34} className="text-cherry" />
          <p className="text-sm font-semibold text-cherry-dark">Pega abajo un link de un reel y se verá aquí mismo</p>
        </div>
      )}

      {/* Pegar un link */}
      <form
        onSubmit={e => {
          e.preventDefault()
          if (pasted.trim()) open(pasted)
        }}
        className="flex gap-2"
      >
        <input
          value={pasted}
          onChange={e => setPasted(e.target.value)}
          placeholder="Link de Instagram, Drive o mp4…"
          className="flex-1 min-w-0 px-4 py-3 rounded-[var(--radius-sm)] text-sm bg-white"
          style={{ border: '1.5px solid rgba(122,24,50,0.15)' }}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 rounded-[var(--radius-sm)] text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'var(--color-cherry)' }}
        >
          Ver
        </button>
      </form>
      {err && <p className="text-xs">{err}</p>}

      {/* De las secciones reales (solo items con instagram_url) */}
      {items.length > 0 && (
        <section>
          <p className="text-sm font-bold text-cherry-dark mb-2.5">De tus secciones ({items.length})</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => item.instagram_url && open(item.instagram_url)}
                className="group flex-shrink-0 w-36 text-left rounded-[var(--radius-sm)] overflow-hidden transition-all hover:scale-[1.03]"
                style={{ background: 'white', border: '1.5px solid rgba(122,24,50,0.08)', boxShadow: 'var(--shadow-soft)' }}
              >
                <div className="relative aspect-[9/16] overflow-hidden bg-cream">
                  <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold leading-tight text-cherry-dark truncate">{item.title}</p>
                  <p className="text-[10px] text-cherry opacity-70 mt-0.5">{item.from}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}