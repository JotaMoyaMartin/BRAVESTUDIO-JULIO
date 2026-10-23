'use client'
/** «Tu marca en 5 minutos»: una pregunta por pantalla, casi todo con un toque. */
import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Mic, Sparkles } from 'lucide-react'
import { useDictateText } from '@/lib/speech'
import { QUESTIONS, type Answers, asList, asText, isAnswered, optionsOf } from '@/lib/marca/questions'

export default function Questionnaire({ answers, onChange, step, onStep, onFinish, busy }: {
  answers: Answers
  onChange: (a: Answers) => void
  step: number
  onStep: (n: number) => void
  onFinish: () => void
  busy: boolean
}) {
  const dictate = useDictateText()
  const [other, setOther] = useState('')
  const [tried, setTried] = useState(false)
  const q = QUESTIONS[Math.min(step, QUESTIONS.length - 1)]
  const total = QUESTIONS.length
  const opts = optionsOf(q, answers)
  const selected = asList(answers[q.id])
  const ok = isAnswered(q, answers)
  const last = step === total - 1

  // Siempre sobre las respuestas MÁS recientes (varios toques seguidos no se pisan).
  const latest = useRef(answers)
  latest.current = answers
  const set = (id: string, v: string | string[] | undefined) => {
    latest.current = { ...latest.current, [id]: v }
    onChange(latest.current)
  }
  const current = (id: string) => asList(latest.current[id])

  function toggle(o: string) {
    if (q.kind === 'single') set(q.id, o)
    else {
      const cur = current(q.id)
      set(q.id, cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o])
    }
  }
  function addOther() {
    const v = other.trim()
    if (!v) return
    if (q.kind === 'single') set(q.id, v)
    else if (!current(q.id).includes(v)) set(q.id, [...current(q.id), v])
    setOther('')
  }
  function next() {
    if (!ok) { setTried(true); return }
    setTried(false)
    if (last) onFinish()
    else onStep(step + 1)
  }

  return (
    <section className="card p-5 sm:p-7 space-y-5 max-w-xl mx-auto" aria-label="Preguntas de tu marca">
      <div className="flex items-center justify-between text-[14px] text-tinta-2">
        <button onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0} className="inline-flex items-center gap-1 font-semibold text-cereza disabled:opacity-0">
          <ArrowLeft size={16} aria-hidden /> Atrás
        </button>
        <span className="tabular-nums">{step + 1} de {total}</span>
      </div>
      <div className="h-2 rounded-full bg-warm-gray overflow-hidden" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
        <div className="h-full rounded-full bg-burdeos transition-all duration-500" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      <div key={q.id} className="space-y-2 animate-[fadeUp_.35s_ease-out]">
        <p className="text-[13px] font-semibold text-cereza">{q.block}</p>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-ink leading-tight">{q.title}</h2>
        {q.help && <p className="text-[15px] text-tinta-2">{q.help}</p>}
      </div>

      {/* Opciones con un toque */}
      {(q.kind === 'single' || q.kind === 'multi') && (
        <div className="flex flex-wrap gap-2" role={q.kind === 'single' ? 'radiogroup' : 'group'}>
          {[...opts, ...(q.allowOther ? selected.filter(s => !opts.includes(s)) : [])].map(o => {
            const on = selected.includes(o) || asText(answers[q.id]) === o
            return (
              <button key={o} onClick={() => toggle(o)} aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[15px] text-left font-medium border transition-colors ${on ? 'bg-burdeos text-crema border-burdeos' : 'bg-white text-ink border-borde hover:border-cereza'}`}>
                {on && <Check size={15} aria-hidden />}{o}
              </button>
            )
          })}
        </div>
      )}
      {q.allowOther && (
        <form onSubmit={e => { e.preventDefault(); addOther() }} className="flex gap-2">
          <input value={other} onChange={e => setOther(e.target.value)} placeholder="Otro: escríbelo aquí" className="input-field flex-1" />
          <button type="submit" className="btn-ghost text-sm">Añadir</button>
        </form>
      )}

      {/* Texto o voz */}
      {q.kind === 'text' && !q.fields && (
        <div className="space-y-2">
          <textarea value={asText(answers[q.id])} onChange={e => set(q.id, e.target.value)} rows={4} placeholder={q.placeholder} className="input-field resize-none text-[16px]" />
          {q.ideas && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-tinta-2">Ideas: tócalas para añadirlas</p>
              <div className="flex flex-wrap gap-2">
                {q.ideas.map(idea => {
                  const used = asText(latest.current[q.id]).includes(idea)
                  return (
                    <button key={idea} type="button" disabled={used}
                      onClick={() => { const cur = asText(latest.current[q.id]); set(q.id, cur ? `${cur.replace(/[.\s]+$/, '')}. ${idea}` : idea) }}
                      className={`rounded-full px-3.5 py-2 text-[14px] text-left border transition-colors ${used ? 'bg-rosa/60 border-transparent text-burdeos' : 'bg-white border-borde text-ink hover:border-cereza'}`}>
                      {used ? '✓ ' : '+ '}{idea}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {q.voice && dictate.supported && (
            <button type="button" onClick={() => (dictate.listening ? dictate.stop() : dictate.start(t => set(q.id, `${asText(answers[q.id])} ${t}`.trim())))}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold ${dictate.listening ? 'bg-cereza text-white animate-pulse' : 'bg-warm-gray text-cherry-dark'}`}>
              <Mic size={17} aria-hidden /> {dictate.listening ? 'Te escucho… toca para parar' : 'Dímelo por voz'}
            </button>
          )}
        </div>
      )}
      {q.fields?.map(f => (
        <label key={f.id} className="block space-y-1.5">
          <span className="text-[14px] font-semibold text-ink">{f.label}</span>
          <input value={asText(answers[f.id])} onChange={e => set(f.id, e.target.value)} placeholder={f.placeholder} className="input-field text-[16px]" />
        </label>
      ))}

      {tried && !ok && <p className="text-[14px] text-cereza" role="alert">Elige una opción o escribe tu respuesta para seguir.</p>}

      <button onClick={next} disabled={busy} className="btn-primary w-full justify-center text-base py-3.5">
        {last ? <><Sparkles size={18} aria-hidden /> {busy ? 'Creando tu estrategia…' : 'Crear mi estrategia'}</> : <>Siguiente <ArrowRight size={18} aria-hidden /></>}
      </button>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}
