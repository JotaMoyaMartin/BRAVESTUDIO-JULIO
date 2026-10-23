'use client'
/**
 * «Tu camino BRÄVE»: 5 etapas en un camino que serpentea. Solo se abre la
 * etapa en curso (2-3 pasos); las siguientes se ven, pero apagadas.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { demoGetPlan } from '@/lib/demo-store'
import { planStatus } from '@/lib/plan/progress'
import { CAMINO, PUBLICADAS_META, caminoProgress, stepDone, type CaminoSignals } from '@/lib/marca/camino'
import Bravi from '@/components/bravi/Bravi'

type Row = { type: string; scheduled_date: string | null; content_json: unknown }

/** Señales reales de la app para completar pasos solos. */
function useSignals(userId: string, hasStrategy: boolean, instagram: boolean): CaminoSignals | null {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    if (userId === 'demo') { setRows(demoGetPlan() as unknown as Row[]); return }
    createClient().from('content_items').select('type, scheduled_date, content_json').eq('user_id', userId)
      .then(({ data }) => setRows((data as Row[] | null) ?? []), () => setRows([]))
  }, [userId])
  return useMemo(() => rows && ({
    marca: hasStrategy,
    instagram,
    planCount: rows.filter(r => r.scheduled_date).length,
    reel: rows.some(r => r.type === 'reel'),
    story: rows.some(r => r.type === 'story'),
    carrusel: rows.some(r => r.type === 'carrusel'),
    publicadas: rows.filter(r => planStatus({ content_json: r.content_json as never }) === 'publicado').length,
  }), [rows, hasStrategy, instagram])
}

// Posiciones de los 5 puntos sobre el camino (viewBox 320 × 470), de abajo arriba.
const NODES = [
  { x: 160, y: 430 }, { x: 70, y: 335 }, { x: 160, y: 240 }, { x: 250, y: 145 }, { x: 160, y: 50 },
]

export default function CaminoPath({ userId, hasStrategy, instagram, manual, onManual }: {
  userId: string
  hasStrategy: boolean
  instagram: boolean
  manual: Record<string, boolean>
  onManual: (id: string, done: boolean) => void
}) {
  const sig = useSignals(userId, hasStrategy, instagram)
  const prog = useMemo(() => sig && caminoProgress(sig, manual), [sig, manual])
  const [open, setOpen] = useState<number | null>(null)
  if (!sig || !prog) return <div className="h-72 rounded-[var(--radius-lg)] bg-white/60 animate-pulse" aria-busy="true" />

  const current = Math.min(prog.current, CAMINO.length - 1)
  const shown = open ?? current
  const stage = prog.stages[shown]
  const finished = prog.current >= CAMINO.length

  return (
    <section className="card overflow-hidden" aria-label="Tu camino BRÄVE">
      <div className="p-5 sm:p-6 pb-0 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-cereza">Tu camino BRÄVE</p>
          <h2 className="text-[22px] font-semibold text-ink leading-tight">
            {finished ? '¡Camino completado!' : `Etapa ${current + 1} de 5 · ${CAMINO[current].name}`}
          </h2>
          <p className="text-[14px] text-tinta-2 mt-0.5">{prog.totalDone} de {prog.total} pasos hechos</p>
        </div>
        <Bravi size={52} showMessage={false} className="flex-shrink-0" />
      </div>

      <div className="grid md:grid-cols-[minmax(0,300px)_1fr] gap-2 items-center">
        {/* El camino */}
        <svg viewBox="0 0 320 470" className="w-full max-w-[230px] sm:max-w-[300px] mx-auto" role="img" aria-label={`Camino de 5 etapas; vas por la ${current + 1}`}>
          <path d="M160 430 C 60 410, 40 370, 70 335 S 170 280, 160 240 S 250 190, 250 145 S 190 70, 160 50"
            fill="none" stroke="#EADFD8" strokeWidth="14" strokeLinecap="round" />
          <path d="M160 430 C 60 410, 40 370, 70 335 S 170 280, 160 240 S 250 190, 250 145 S 190 70, 160 50"
            fill="none" stroke="#7A1832" strokeWidth="14" strokeLinecap="round"
            pathLength={100} strokeDasharray={`${Math.min(100, (Math.min(prog.current, 4) / 4) * 100)} 100`} />
          {NODES.map((n, k) => {
            const st = prog.stages[k]
            const isCur = k === current && !finished
            const done = st.complete
            return (
              <g key={st.id} onClick={() => setOpen(k)} style={{ cursor: 'pointer' }} role="button" aria-label={`${st.name}: ${st.done} de ${st.total}`}>
                {isCur && <circle cx={n.x} cy={n.y} r="34" fill="#FFF1B5" opacity="0.9"><animate attributeName="r" values="30;36;30" dur="2.4s" repeatCount="indefinite" /></circle>}
                <circle cx={n.x} cy={n.y} r={isCur ? 26 : 22} fill={done ? '#2A7A4A' : isCur ? '#591427' : '#F4EDE4'} stroke={k === shown ? '#B8324F' : done || isCur ? 'none' : '#D9CDBE'} strokeWidth="3" />
                <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="17" fontWeight="700" fill={done || isCur ? '#FFF7EE' : '#9C8B7A'}>{done ? '✓' : k + 1}</text>
                <text x={k === 1 ? n.x + 34 : k === 3 ? n.x - 34 : n.x + 36} y={n.y + 5} textAnchor={k === 3 ? 'end' : 'start'} fontSize="14" fontWeight="600" fill={done || isCur ? '#2B1A1F' : '#9C8B7A'}>{st.name}</text>
              </g>
            )
          })}
        </svg>

        {/* La etapa abierta */}
        <div className="p-5 sm:p-6 pt-0 md:pt-6 space-y-3">
          <div>
            <p className="text-[13px] font-semibold text-cereza">{shown > current ? 'Próximamente' : shown < current ? 'Etapa completada' : 'Ahora'}</p>
            <p className="text-[18px] font-semibold text-ink">{stage.name}</p>
            <p className="text-[15px] text-tinta-2">{stage.goal}</p>
          </div>
          {shown > current && !finished ? (
            <p className="flex items-center gap-2 text-[15px] text-tinta-2 rounded-2xl bg-warm-gray p-3.5"><Lock size={16} aria-hidden /> Se abre cuando termines «{CAMINO[current].name}».</p>
          ) : (
            <ul className="space-y-2">
              {stage.steps.map((s, i) => {
                const done = stepDone(s, sig, manual)
                const manualOnly = !s.auto
                return (
                  <li key={s.id} className={`flex items-stretch rounded-2xl border transition-colors ${done ? 'border-transparent bg-[#EAF3EC]' : 'border-borde bg-white hover:border-cereza'}`}>
                    {/* El círculo marca el paso (solo los que no se completan solos). */}
                    <button
                      onClick={() => manualOnly && onManual(s.id, !done)}
                      disabled={!manualOnly}
                      aria-label={done ? `Hecho: ${s.label}${manualOnly ? ' (toca para desmarcar)' : ''}` : manualOnly ? `Marcar como hecho: ${s.label}` : `Paso ${i + 1}: ${s.label}`}
                      className="pl-3.5 pr-2 flex items-center flex-shrink-0">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-semibold tabular-nums ${done ? 'bg-[#2A7A4A] text-white' : 'border-2 border-borde text-tinta-2'}`}>
                        {done ? <Check size={16} aria-hidden /> : i + 1}
                      </span>
                    </button>
                    {/* Todo el resto lleva a lo que hay que hacer. */}
                    <Link href={s.href} className="flex-1 min-w-0 flex items-center gap-3 py-3 pr-3.5 pl-1.5">
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[15px] font-semibold ${done ? 'text-tinta-2 line-through decoration-1' : 'text-ink'}`}>{s.label}</span>
                        <span className="block text-[13px] text-tinta-2">
                          {s.auto === 'publicadas' && !done ? `Llevas ${sig.publicadas} de ${PUBLICADAS_META}` : s.hint}{manualOnly && !done ? ' · toca el número cuando lo hagas' : ''}
                        </span>
                      </span>
                      {done
                        ? <span className="text-[13px] font-semibold text-[#2A7A4A] flex-shrink-0">Ver</span>
                        : <span className="flex-shrink-0 w-9 h-9 rounded-full bg-burdeos text-crema flex items-center justify-center" aria-hidden><ArrowRight size={16} /></span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {open !== null && open !== current && (
            <button onClick={() => setOpen(null)} className="text-[14px] font-semibold text-cereza hover:underline">Volver a mi etapa</button>
          )}
        </div>
      </div>
    </section>
  )
}
