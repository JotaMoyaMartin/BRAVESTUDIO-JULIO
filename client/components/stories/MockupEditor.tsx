'use client'
/**
 * Editor de una story con arte: sube tus fotos (se colocan solas en su
 * hueco), ajusta el encuadre, cambia los textos y descarga en 1080×1920.
 */
import { useRef, useState } from 'react'
import { ArrowLeft, Download, ImagePlus, Loader2, X } from 'lucide-react'
import { useSessionState } from '@/lib/session-store'
import { useToast } from '@/components/ui/Toast'
import AddToPlanButton from '@/components/plan/AddToPlanButton'
import MockupStory, { emptyMockupState, type MockupState } from './MockupStory'
import { renderMockupToBlob } from '@/lib/stories/render-mockup'
import type { MockupTemplate } from '@/lib/stories/mockups'

/** Foto del móvil → JPEG de 1400 px como mucho (rápido y cabe en el navegador). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const k = Math.min(1, 1400 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.86)
  } finally { URL.revokeObjectURL(url) }
}

export default function MockupEditor({ userId, tpl, onBack }: { userId: string; tpl: MockupTemplate; onBack: () => void }) {
  const toast = useToast()
  const [state, setState] = useSessionState<MockupState>(`u:${userId}:story-designer:mockup:${tpl.id}`, emptyMockupState())
  const [busy, setBusy] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const setPhoto = (id: string, v: string | null) => setState(s => {
    const photos = { ...s.photos }
    if (v) photos[id] = v; else delete photos[id]
    return { ...s, photos }
  })

  async function pick(id: string, f: File | undefined) {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.show('Elige una foto.', 'info'); return }
    try { setPhoto(id, await shrink(f)) } catch { toast.show('No he podido abrir esa foto. Prueba con otra.', 'info') }
  }

  async function download() {
    if (busy) return
    setBusy(true)
    try {
      const blob = await renderMockupToBlob(tpl, state)
      const file = new File([blob], `story-${tpl.id}.png`, { type: 'image/png' })
      const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent)
      if (isMobile && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file); a.download = file.name; a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch {
      toast.show('No se ha podido descargar. Inténtalo de nuevo.', 'info')
    } finally { setBusy(false) }
  }

  const missing = tpl.slots.filter(s => !state.photos[s.id])

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-cereza hover:underline"><ArrowLeft size={15} aria-hidden /> Otras plantillas</button>
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_1fr] items-start">
        <div className="space-y-3 md:sticky md:top-4">
          <MockupStory tpl={tpl} state={state} className="w-full max-w-[320px] mx-auto rounded-2xl shadow-[var(--shadow-soft)]" />
          {missing.length > 0 && <p className="text-[13px] text-tinta-2 text-center">Ves fotos de ejemplo: sube las tuyas.</p>}
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-semibold text-ink">{tpl.name}</h2>
            <p className="text-[14px] text-tinta-2">{tpl.hint}</p>
          </div>

          {tpl.slots.map(s => (
            <div key={s.id} className="rounded-2xl border border-borde bg-white p-4 space-y-3">
              <p className="text-[15px] font-semibold text-ink">{s.label}</p>
              <input ref={el => { fileRefs.current[s.id] = el }} type="file" accept="image/*" className="sr-only" onChange={e => { pick(s.id, e.target.files?.[0]); e.target.value = '' }} />
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.photos[s.id] || s.sample} alt="" className={`w-16 h-16 rounded-xl object-cover ${state.photos[s.id] ? '' : 'opacity-50'}`} />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => fileRefs.current[s.id]?.click()} className="btn-primary text-sm"><ImagePlus size={15} aria-hidden /> {state.photos[s.id] ? 'Cambiar foto' : 'Subir foto'}</button>
                  {state.photos[s.id] && <button onClick={() => setPhoto(s.id, null)} className="btn-ghost text-sm"><X size={14} aria-hidden /> Quitar</button>}
                </div>
              </div>
              {state.photos[s.id] && (
                <label className="block space-y-1">
                  <span className="text-[13px] text-tinta-2">Encuadre: mueve para ver más arriba o más abajo</span>
                  <input type="range" min={0} max={100} value={state.focus[s.id] ?? 40}
                    onChange={e => setState(st => ({ ...st, focus: { ...st.focus, [s.id]: Number(e.target.value) } }))}
                    className="w-full accent-[#591427]" aria-label={`Encuadre de ${s.label}`} />
                </label>
              )}
            </div>
          ))}

          {tpl.texts.length > 0 && (
            <div className="rounded-2xl border border-borde bg-white p-4 space-y-3">
              <p className="text-[15px] font-semibold text-ink">Textos</p>
              {tpl.texts.map(t => (
                <label key={t.id} className="block space-y-1.5">
                  <span className="text-[13px] font-semibold text-tinta-2">{t.label}</span>
                  {t.multiline ? (
                    <textarea rows={t.id === 'lista' ? 5 : 3} value={state.texts[t.id] ?? t.value}
                      onChange={e => setState(st => ({ ...st, texts: { ...st.texts, [t.id]: e.target.value } }))} className="input-field text-[16px] resize-none" />
                  ) : (
                    <input value={state.texts[t.id] ?? t.value} maxLength={80}
                      onChange={e => setState(st => ({ ...st, texts: { ...st.texts, [t.id]: e.target.value } }))} className="input-field text-[16px]" />
                  )}
                </label>
              ))}
              <p className="text-[12px] text-tinta-2">Pon una palabra entre **asteriscos** para que salga en cursiva.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={download} disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />} Descargar story
            </button>
            <AddToPlanButton userId={userId} className="btn-secondary" getPayload={() => ({
              type: 'story',
              title: (state.texts[tpl.texts[0]?.id] ?? tpl.texts[0]?.value ?? tpl.name).replace(/\*\*/g, '') || tpl.name,
              content_json: { stories: [{ number: 1, role: 'Story', text: tpl.texts.map(t => (state.texts[t.id] ?? t.value).replace(/\*\*/g, '')).join(' — ') || tpl.name }], mockup: tpl.id },
              format: `Plantilla ${tpl.name}`,
            })} />
          </div>
        </div>
      </div>

    </div>
  )
}
