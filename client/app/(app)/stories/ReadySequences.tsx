'use client'
import { useMemo, useState } from 'react'
import { Check, Copy, ImagePlus, Wand2, ChevronDown, Camera, BarChart3 } from 'lucide-react'
import {
  READY_SEQUENCES, SEQUENCE_TYPES, SEQUENCE_SERVICES, sequenceType,
  ReadySequence, SequenceType,
} from '@/lib/stories/sequences'
import { copyToClipboard } from '@/lib/content-utils'

/**
 * SECUENCIAS LISTAS (21-oct-2026): biblioteca de secuencias de hasta 3
 * stories ya escritas con el estándar BRÄVE, por tipo y servicio.
 * Eliges una → copias el texto o le pones tu foto/clip y la descargas.
 */
export default function ReadySequences({
  onDesign,
  onAdapt,
}: {
  /** Abre el diseñador con esta secuencia (foto + texto + descarga). */
  onDesign: (seq: ReadySequence) => void
  /** Lleva a «Crea la tuya» con la idea para adaptarla con IA. */
  onAdapt: (seq: ReadySequence) => void
}) {
  const [type, setType] = useState<SequenceType | 'todas'>('todas')
  const [service, setService] = useState<string>('todos')
  const [open, setOpen] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const list = useMemo(
    () => READY_SEQUENCES.filter(s => (type === 'todas' || s.type === type) && (service === 'todos' || s.service === service)),
    [type, service],
  )

  function copy(text: string, key: string) {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const sequenceText = (s: ReadySequence) =>
    s.stories.map((st, i) => `Story ${i + 1}: ${st.text}${st.poll ? `\n(Encuesta: ${st.poll.label} — ${st.poll.options.join(' / ')})` : ''}`).join('\n\n')

  return (
    <div className="space-y-4">
      {/* Para qué: los 5 tipos */}
      <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="toolbar" aria-label="Tipo de secuencia">
        <button className="chip flex-shrink-0" aria-pressed={type === 'todas'} onClick={() => setType('todas')}>Todas</button>
        {SEQUENCE_TYPES.map(t => (
          <button key={t.id} className="chip flex-shrink-0" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.name}</button>
        ))}
      </div>
      {type !== 'todas' && (
        <p className="text-[15px] text-tinta-2">
          <b className="text-burdeos font-semibold">{sequenceType(type).name}:</b> {sequenceType(type).goal.toLowerCase()}.{' '}
          {sequenceType(type).beats.map(b => b.role).join(' → ')}.
        </p>
      )}
      <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="toolbar" aria-label="Servicio">
        <button className="chip flex-shrink-0" aria-pressed={service === 'todos'} onClick={() => setService('todos')}>Todos los servicios</button>
        {SEQUENCE_SERVICES.map(s => (
          <button key={s} className="chip flex-shrink-0" aria-pressed={service === s} onClick={() => setService(s)}>{s}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map(seq => {
          const def = sequenceType(seq.type)
          const isOpen = open === seq.id
          return (
            <article key={seq.id} className={`card overflow-hidden ${isOpen ? 'sm:col-span-2' : ''}`}>
              <button
                onClick={() => setOpen(isOpen ? null : seq.id)}
                aria-expanded={isOpen}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-burdeos text-crema">{def.name}</span>
                    <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-rosa text-burdeos">{seq.service}</span>
                  </div>
                  <p className="text-base font-semibold text-ink leading-snug">{seq.title}</p>
                  {!isOpen && <p className="text-[14px] text-tinta-2 leading-snug line-clamp-2">«{seq.stories[0].text}»</p>}
                </div>
                <span className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-warm-gray text-cherry-dark flex items-center justify-center">
                  <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <ol className="grid gap-2.5 md:grid-cols-3">
                    {seq.stories.map((st, i) => (
                      <li key={i} className="rounded-2xl bg-cream border border-borde p-3.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-cereza">Story {i + 1} · {def.beats[i]?.role}</span>
                          <button
                            onClick={() => copy(st.text, `${seq.id}-${i}`)}
                            className="text-[12px] font-semibold text-cherry-dark flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white"
                            aria-label={`Copiar texto de la story ${i + 1}`}
                          >
                            {copied === `${seq.id}-${i}` ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                            {copied === `${seq.id}-${i}` ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <p className="text-[15px] leading-relaxed text-ink">{st.text}</p>
                        <p className="text-[13px] text-tinta-2 flex gap-1.5"><Camera size={14} className="mt-0.5 flex-shrink-0" aria-hidden /> {st.visual}</p>
                        {st.poll && (
                          <p className="text-[13px] text-burdeos bg-mantequilla/70 rounded-xl px-2.5 py-2 flex gap-1.5">
                            <BarChart3 size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
                            <span>Añade en Instagram una encuesta: <b>{st.poll.label}</b> ({st.poll.options.join(' / ')})</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={() => onDesign(seq)} className="btn-primary justify-center sm:flex-1">
                      <ImagePlus size={16} aria-hidden /> Ponle tu foto y descarga
                    </button>
                    <button onClick={() => copy(sequenceText(seq), `${seq.id}-all`)} className="btn-secondary justify-center">
                      {copied === `${seq.id}-all` ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                      {copied === `${seq.id}-all` ? 'Copiadas' : 'Copiar las 3'}
                    </button>
                    <button onClick={() => onAdapt(seq)} className="btn-ghost justify-center">
                      <Wand2 size={16} aria-hidden /> Adaptar a mi salón
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
