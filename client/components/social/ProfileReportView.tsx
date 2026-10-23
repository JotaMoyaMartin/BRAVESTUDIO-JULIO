'use client'
/**
 * ANÁLISIS DE PERFIL (22-oct-2026): informe legible en el móvil.
 * Orden pensado para la estilista: resumen → números clave → bio y nombre
 * (copiar) → qué publicar y cuándo → ideas que van a «Mi plan».
 * Todo número sale de stats (datos reales); la IA solo redacta `advice`.
 */
import { useState } from 'react'
import { Check, Copy, Info, RefreshCw, Sparkles } from 'lucide-react'
import AddToPlanButton from '@/components/plan/AddToPlanButton'
import { typeStyle } from '@/components/plan/WeekPlan'
import { FORMAT_LABEL } from '@/lib/social/profile-stats'
import type { ProfileReport } from '@/lib/social/analysis'

const fmt = (v: number) => v.toLocaleString('es-ES')

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* sin portapapeles */ }
      }}
      className="btn-ghost text-sm flex-shrink-0 !px-3 !py-1.5"
      aria-label={done ? 'Copiado' : 'Copiar'}
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {done ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6 space-y-3">
      <div>
        <h3 className="text-[17px] font-semibold text-burdeos">{title}</h3>
        {hint && <p className="text-[13px] text-tinta-2 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-warm-gray/60 p-3.5">
      <p className="text-[22px] font-bold text-ink leading-tight">{value}</p>
      <p className="text-[12.5px] text-tinta-2 mt-0.5 leading-snug">{label}</p>
    </div>
  )
}

export default function ProfileReportView({
  report,
  userId,
  onRegenerate,
  regenerating = false,
}: {
  report: ProfileReport
  userId: string
  /** Vuelve a analizar (con la bio pegada si Meta no la da). */
  onRegenerate?: (bio?: string) => void
  regenerating?: boolean
}) {
  const { profile, stats, advice } = report
  const [bioDraft, setBioDraft] = useState('')
  const maxAvg = Math.max(1, ...stats.formats.map(f => f.avgInteractions))
  const generated = new Date(report.generatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

  return (
    <div className="space-y-4">
      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-lg)] bg-burdeos text-crema p-5 sm:p-6">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-white/30" />
          ) : (
            <span className="h-14 w-14 rounded-full bg-white/15 flex items-center justify-center text-xl font-bold">
              {(profile.username || 'I').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold truncate">@{profile.username}</p>
            <p className="text-[13px] opacity-80 truncate">
              {profile.followers !== null ? `${fmt(profile.followers)} seguidores · ` : ''}
              {stats.postsAnalyzed} publicaciones analizadas
            </p>
          </div>
          {report.demo && <span className="ml-auto rounded-full bg-mantequilla text-burdeos text-[12px] font-bold px-2.5 py-1">Ejemplo</span>}
        </div>
        {advice?.resumen && <p className="mt-4 text-[15.5px] leading-relaxed">{advice.resumen}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] opacity-80">
          <span>Informe del {generated}</span>
          {onRegenerate && !report.demo && (
            <button onClick={() => onRegenerate()} disabled={regenerating} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-semibold text-crema opacity-100 disabled:opacity-60">
              <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} aria-hidden /> {regenerating ? 'Analizando…' : 'Analizar de nuevo'}
            </button>
          )}
        </div>
      </div>

      {/* ── Números clave ────────────────────────────────────────── */}
      <Block title="Tus números" hint={`Últimas ${stats.postsAnalyzed} publicaciones, en ${stats.periodDays} días.`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat value={String(stats.postsPerWeek).replace('.', ',')} label="publicaciones por semana" />
          <Stat
            value={stats.daysSinceLastPost === null ? '—' : stats.daysSinceLastPost === 0 ? 'Hoy' : stats.daysSinceLastPost === 1 ? 'Ayer' : `${stats.daysSinceLastPost} días`}
            label={stats.daysSinceLastPost !== null && stats.daysSinceLastPost <= 1 ? 'fue tu última publicación' : 'desde tu última publicación'}
          />
          <Stat value={fmt(stats.avgInteractions)} label="me gusta + comentarios de media" />
          <Stat value={stats.engagementRate === null ? '—' : `${String(stats.engagementRate).replace('.', ',')}%`} label="interacción media por publicación (sobre tus seguidores)" />
        </div>
      </Block>

      {/* ── Formatos ─────────────────────────────────────────────── */}
      <Block title="Qué formato te funciona" hint="Media de me gusta + comentarios por publicación.">
        <ul className="space-y-3">
          {stats.formats.map(f => (
            <li key={f.format}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="font-semibold text-ink">
                  {FORMAT_LABEL[f.format]} {stats.bestFormat === f.format && <span className="ml-1 rounded-full bg-mantequilla text-burdeos text-[11px] font-bold px-2 py-0.5">El mejor</span>}
                </span>
                <span className="text-tinta-2">{f.count} ({f.share}%) · <b className="text-ink">{fmt(f.avgInteractions)}</b></span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-warm-gray overflow-hidden">
                <div className="h-full rounded-full bg-cereza" style={{ width: `${Math.round((f.avgInteractions / maxAvg) * 100)}%` }} />
              </div>
              {f.avgReach !== null && <p className="text-[12px] text-tinta-2 mt-1">Llegan de media a {fmt(f.avgReach)} cuentas</p>}
            </li>
          ))}
        </ul>
      </Block>

      {/* ── Cuándo publicar ──────────────────────────────────────── */}
      <Block title="Cuándo publicar" hint="Según cómo funcionaron tus propias publicaciones.">
        {stats.bestDays || stats.bestTimes ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[{ t: 'Mejores días', list: stats.bestDays }, { t: 'Mejores horas', list: stats.bestTimes }]
              .filter((col): col is { t: string; list: NonNullable<typeof stats.bestDays> } => !!col.list)
              .map(col => (
              <div key={col.t}>
                <p className="text-[13px] font-semibold text-tinta-2 mb-1.5">{col.t}</p>
                <ol className="space-y-1.5">
                  {col.list.map((s, i) => (
                    <li key={s.label} className="flex items-center justify-between gap-2 rounded-xl bg-warm-gray/60 px-3 py-2 text-[14px]">
                      <span className="first-letter:uppercase"><b className="text-cereza mr-1.5">{i + 1}</b>{s.label}</span>
                      <span className="text-[12px] text-tinta-2">{s.posts} publ.</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-tinta-2">Todavía no hay publicaciones suficientes en días y horas distintos para saberlo. Prueba a publicar en momentos diferentes estas semanas y vuelve a analizar.</p>
        )}
      </Block>

      {advice && (
        <>
          {/* ── Bio ──────────────────────────────────────────────── */}
          <Block title="Tu bio, mejorada" hint="Elige una, cópiala y pégala en Instagram › Editar perfil. Cambia lo que va entre [corchetes].">
            {profile.biography && (
              <div className="rounded-xl border border-borde p-3 text-[14px] text-tinta-2">
                <p className="text-[12px] font-semibold mb-1">Ahora tienes</p>
                <p className="whitespace-pre-line">{profile.biography}</p>
              </div>
            )}
            <ul className="space-y-2.5">
              {advice.bios.map((b, i) => (
                <li key={i} className="rounded-xl bg-warm-gray/60 p-3.5">
                  <p className="text-[15px] text-ink whitespace-pre-line">{b.texto}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-tinta-2">{b.por_que} <span className="whitespace-nowrap">· {b.texto.length}/150</span></p>
                    <CopyButton text={b.texto} />
                  </div>
                </li>
              ))}
            </ul>
          </Block>

          {/* ── Nombre y búsqueda ───────────────────────────────── */}
          {(advice.nombre || advice.keywords.length > 0) && (
            <Block title="Que te encuentren al buscar" hint="Instagram busca por tu nombre de perfil, no solo por tu @.">
              {advice.nombre && (
                <div className="rounded-xl bg-warm-gray/60 p-3.5">
                  <p className="text-[12px] font-semibold text-tinta-2">Nombre propuesto{profile.name ? ` (ahora: ${profile.name})` : ''}</p>
                  <p className="text-[15px] font-semibold text-ink mt-0.5">{advice.nombre.sugerido}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-tinta-2">{advice.nombre.por_que}</p>
                    <CopyButton text={advice.nombre.sugerido} />
                  </div>
                </div>
              )}
              {advice.keywords.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-tinta-2 mb-1.5">Palabras que buscan tus clientas — úsalas en bio, textos y nombre</p>
                  <div className="flex flex-wrap gap-1.5">
                    {advice.keywords.map(k => <span key={k} className="rounded-full bg-mantequilla text-burdeos text-[13px] font-semibold px-3 py-1">{k}</span>)}
                  </div>
                </div>
              )}
            </Block>
          )}

          {/* ── Mezcla semanal ─────────────────────────────────── */}
          {advice.mezcla && (
            <Block title="Tu semana ideal" hint={advice.mezcla.por_que}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Stat value={String(advice.mezcla.reels)} label="reels" />
                <Stat value={String(advice.mezcla.carruseles)} label="carruseles" />
                <Stat value={String(advice.mezcla.fotos)} label="fotos" />
                <Stat value={`${advice.mezcla.stories_dias} días`} label="con stories" />
              </div>
            </Block>
          )}

          {/* ── Funciona / mejorar ─────────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-4">
            {advice.que_funciona.length > 0 && (
              <Block title="Lo que te funciona">
                <ul className="space-y-2 text-[14.5px] text-ink">
                  {advice.que_funciona.map((t, i) => <li key={i} className="flex gap-2"><Check size={17} className="text-[#2A7A4A] flex-shrink-0 mt-0.5" aria-hidden />{t}</li>)}
                </ul>
              </Block>
            )}
            {advice.que_mejorar.length > 0 && (
              <Block title="Qué cambiar">
                <ul className="space-y-2 text-[14.5px] text-ink">
                  {advice.que_mejorar.map((t, i) => <li key={i} className="flex gap-2"><span className="text-cereza font-bold flex-shrink-0 w-[17px] text-center">{i + 1}</span>{t}</li>)}
                </ul>
              </Block>
            )}
          </div>

          {/* ── Ideas → Mi plan ────────────────────────────────── */}
          {advice.ideas.length > 0 && (
            <Block title="Ideas para tu plan" hint="Añade las que te gusten: quedan en Mi plan como «Idea» en el día que elijas.">
              <ul className="space-y-2.5">
                {advice.ideas.map((idea, i) => {
                  const ts = typeStyle(idea.tipo)
                  const Icon = ts.icon
                  return (
                    <li key={i} className="rounded-xl border border-borde p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ts.bg, color: ts.color }}><Icon size={17} aria-hidden /></span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold" style={{ color: ts.color }}>{ts.label}</p>
                          <p className="text-[15px] font-semibold text-ink leading-snug">{idea.titulo}</p>
                          {idea.por_que && <p className="text-[12.5px] text-tinta-2 mt-0.5">{idea.por_que}</p>}
                        </div>
                      </div>
                      <AddToPlanButton
                        userId={userId}
                        status="idea"
                        className="btn-ghost text-sm justify-center sm:flex-shrink-0"
                        getPayload={() => ({
                          type: idea.tipo,
                          title: idea.titulo,
                          content_json: { source: 'analisis-perfil', por_que: idea.por_que },
                          visual_idea: idea.por_que || null,
                        })}
                      />
                    </li>
                  )
                })}
              </ul>
            </Block>
          )}
        </>
      )}

      {/* ── Bio no disponible: pegarla ───────────────────────────── */}
      {onRegenerate && !report.demo && !profile.bioAvailable && (
        <Block title="Pega tu bio actual" hint="Instagram no nos deja leerla. Pégala y te proponemos versiones mejores.">
          <textarea value={bioDraft} onChange={e => setBioDraft(e.target.value)} maxLength={300} rows={3} className="input-field text-base w-full" placeholder="Copia aquí el texto de tu bio" />
          <button disabled={!bioDraft.trim() || regenerating} onClick={() => onRegenerate(bioDraft)} className="btn-primary justify-center w-full sm:w-auto">
            <Sparkles size={16} aria-hidden /> {regenerating ? 'Analizando…' : 'Mejorar mi bio'}
          </button>
        </Block>
      )}

      {/* ── Lo que no sabemos (honestidad) ───────────────────────── */}
      {report.missing.length > 0 && (
        <div className="rounded-2xl border border-borde p-4 text-[13px] text-tinta-2 space-y-1.5">
          <p className="flex items-center gap-1.5 font-semibold text-ink"><Info size={15} aria-hidden /> Para que lo tengas en cuenta</p>
          <ul className="list-disc pl-5 space-y-1">
            {report.missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
