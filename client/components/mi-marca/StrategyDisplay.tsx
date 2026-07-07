'use client'
import { useState } from 'react'
import { StrategyDocument } from '@/lib/strategy-types'
import { motion } from 'framer-motion'
import {
  Star, FileText, Heart, Scissors, Target, BarChart3,
  Layers, MessageCircle, User, Palette, AlertTriangle,
  CheckSquare, Sparkles, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Props {
  strategy: StrategyDocument
  onRegenerate: () => void
  justGenerated?: boolean
}

export function StrategyDisplay({ strategy, onRegenerate, justGenerated }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Hero header — palpita brevemente cuando acaba de generarse */}
      <div
        className={`rounded-[var(--radius-lg)] overflow-hidden shadow-medium ${justGenerated ? 'pulse-attention' : ''}`}
        style={{ border: '2px solid var(--color-cherry)' }}
      >
        <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, var(--color-cherry) 0%, var(--color-cherry-dark) 100%)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center float-soft" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Star size={20} style={{ color: 'white' }} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">Tu Estrategia BRÄVE</h2>
            <p className="text-xs text-white opacity-80">Documento estratégico profesional — generado por IA</p>
          </div>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold text-white transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={13} /> Regenerar
          </button>
        </div>
      </div>

      {/* Sections */}
      <SectionCard icon={Sparkles} title="Perfil BRÄVE" color="cherry" index={1}>
        <p className="text-sm leading-relaxed text-ink">{strategy.perfil_brave}</p>
      </SectionCard>

      <SectionCard icon={FileText} title="Resumen Ejecutivo" color="cherry" index={2}>
        <p className="text-sm leading-relaxed text-ink">{strategy.resumen_ejecutivo}</p>
      </SectionCard>

      <SectionCard icon={Heart} title="Clienta Ideal" color="cherry" index={3}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink">{strategy.clienta_ideal.descripcion}</p>
          {strategy.clienta_ideal.edad && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
              Edad: {strategy.clienta_ideal.edad}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            <SubList title="Problemas" items={strategy.clienta_ideal.problemas} color="#c0394e" />
            <SubList title="Deseos" items={strategy.clienta_ideal.deseos} color="#27a36a" />
            <SubList title="Objeciones" items={strategy.clienta_ideal.objeciones} color="#2a5a6a" />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Scissors} title="Servicios y Prioridades" color="cherry" index={4}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-buttermilk)' }}>
                <th className="text-left py-2 px-2 font-bold text-cherry text-xs uppercase tracking-wider">Servicio</th>
                <th className="text-left py-2 px-2 font-bold text-cherry text-xs uppercase tracking-wider">Prioridad</th>
                <th className="text-left py-2 px-2 font-bold text-cherry text-xs uppercase tracking-wider">Razón</th>
              </tr>
            </thead>
            <tbody>
              {strategy.servicios.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,241,181,0.5)' }}>
                  <td className="py-2.5 px-2 font-medium text-ink">{s.name}</td>
                  <td className="py-2.5 px-2">
                    <PriorityBadge priority={s.priority} />
                  </td>
                  <td className="py-2.5 px-2 text-ink opacity-80">{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard icon={Target} title="Objetivos 1/3/6 meses" color="cherry" index={5}>
        <div className="space-y-3">
          {strategy.objetivos.map((o, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-buttermilk)' }}>
              <div className="flex-shrink-0 w-16">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full inline-block" style={{ background: 'var(--color-cherry)', color: 'white' }}>
                  {o.timeframe}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-ink">{o.goal}</p>
                <p className="text-xs mt-0.5 text-ink opacity-70">→ {o.action}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={BarChart3} title="Estrategia de Contenido" color="cherry" index={6}>
        <div className="space-y-3">
          {strategy.estrategia_contenido.map((e, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{e.type}</span>
                <span className="text-sm font-bold text-cherry">{e.percentage}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-warm-gray)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${e.percentage}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'var(--color-cherry)' }}
                />
              </div>
              <p className="text-xs text-ink opacity-60">{e.reason}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Layers} title="Pilares de Contenido" color="cherry" index={7}>
        <div className="grid sm:grid-cols-2 gap-3">
          {strategy.pilares_contenido.map((p, i) => (
            <div key={i} className="p-4 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-buttermilk)' }}>
              <p className="font-bold text-sm text-cherry">{p.name}</p>
              <p className="text-xs mt-1 text-ink opacity-80 leading-relaxed">{p.description}</p>
              {p.examples.length > 0 && (
                <div className="mt-2 space-y-1">
                  {p.examples.map((ex, j) => (
                    <p key={j} className="text-xs text-ink opacity-60 flex items-start gap-1.5">
                      <span style={{ color: 'var(--color-cherry)', opacity: 0.5 }}>•</span>
                      {ex}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={MessageCircle} title="Estilo de Comunicación" color="cherry" index={8}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-buttermilk)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Tono</p>
              <p className="text-sm mt-1 text-ink">{strategy.estilo_comunicacion.tono}</p>
            </div>
            <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-buttermilk)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Voz</p>
              <p className="text-sm mt-1 text-ink">{strategy.estilo_comunicacion.voz}</p>
            </div>
          </div>
          {strategy.estilo_comunicacion.ejemplos.length > 0 && (
            <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-pastel-blue)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#2a5a6a', opacity: 0.7 }}>Frases de ejemplo</p>
              <div className="space-y-1.5">
                {strategy.estilo_comunicacion.ejemplos.map((ex, i) => (
                  <p key={i} className="text-sm italic text-ink">"{ex}"</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={User} title="Imagen Personal" color="cherry" index={9}>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ink">{strategy.imagen_personal.descripcion}</p>
          {strategy.imagen_personal.consejos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-cherry-dark opacity-60">Consejos</p>
              {strategy.imagen_personal.consejos.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-cherry)', color: 'white' }}>{i + 1}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={Palette} title="Recomendaciones Visuales" color="cherry" index={10}>
        <div className="space-y-2">
          {strategy.recomendaciones_visuales.map((r, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-cream)' }}>
              <span className="text-sm" style={{ color: 'var(--color-cherry)' }}>🎨</span>
              <span className="text-sm text-ink">{r}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={AlertTriangle} title="Errores Detectados" color="danger" index={11}>
        <div className="space-y-2">
          {strategy.errores_detectados.map((e, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-[var(--radius-sm)]" style={{ background: 'rgba(192,57,78,0.08)', border: '1px solid rgba(192,57,78,0.2)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
              <span className="text-sm text-ink">{e}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={CheckSquare} title="Plan de Acción" color="cherry" index={12}>
        <ActionChecklist items={strategy.plan_accion} />
      </SectionCard>

      {/* Resumen para toda la IA — highlighted */}
      <div className="rounded-[var(--radius-lg)] overflow-hidden shadow-medium" style={{ border: '2px solid var(--color-cherry)' }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'var(--color-cherry-dark)' }}>
          <Sparkles size={18} style={{ color: 'white' }} />
          <h3 className="font-bold text-white text-sm">Resumen para toda la IA</h3>
        </div>
        <div className="p-5" style={{ background: 'var(--color-pastel-blue)' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#1a3a4a' }}>{strategy.resumen_para_ia}</p>
          <p className="text-xs mt-3" style={{ color: '#2a5a6a', opacity: 0.6 }}>
            ✓ Este resumen se usa automáticamente como contexto en todas las generaciones de contenido.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Section card wrapper ────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, color, index, children,
}: {
  icon: typeof Star
  title: string
  color: 'cherry' | 'danger'
  index: number
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const bgColor = color === 'danger' ? 'rgba(192,57,78,0.08)' : 'var(--color-buttermilk)'
  const iconColor = color === 'danger' ? 'var(--color-danger)' : 'var(--color-cherry)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
      className="rounded-[var(--radius-md)] bg-white shadow-soft overflow-hidden"
      style={{ border: '1.5px solid var(--color-buttermilk)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: bgColor }}>
            <Icon size={16} style={{ color: iconColor }} />
          </div>
          <span className="font-bold text-sm text-ink">{title}</span>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--color-cherry)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-cherry)' }} />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid rgba(255,241,181,0.5)' }}>
          {children}
        </div>
      )}
    </motion.div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function SubList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="p-3 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-cream)' }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color, opacity: 0.8 }}>{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-ink flex items-start gap-1.5 leading-relaxed">
            <span style={{ color, opacity: 0.5 }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    alta: { bg: 'rgba(192,57,78,0.12)', color: '#c0394e' },
    media: { bg: 'rgba(255,193,7,0.15)', color: '#8a6d00' },
    baja: { bg: 'rgba(39,163,106,0.12)', color: '#1a7a4a' },
  }
  const c = colors[priority] || colors.media
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      {priority.toUpperCase()}
    </span>
  )
}

function ActionChecklist({ items }: { items: { text: string; done: boolean }[] }) {
  const [checked, setChecked] = useState<Set<number>>(
    new Set(items.map((item, i) => item.done ? i : -1).filter(i => i >= 0))
  )

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isChecked = checked.has(i)
        return (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="w-full flex items-start gap-3 p-3 rounded-[var(--radius-sm)] text-left transition-all"
            style={{
              background: isChecked ? 'var(--color-pastel-green)' : 'var(--color-cream)',
              border: `1px solid ${isChecked ? 'rgba(39,163,106,0.3)' : 'var(--color-buttermilk)'}`,
            }}
          >
            <div
              className="flex-shrink-0 w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center mt-0.5 transition-all"
              style={{
                background: isChecked ? '#27a36a' : 'transparent',
                border: isChecked ? 'none' : '2px solid rgba(122,24,50,0.2)',
              }}
            >
              {isChecked && <CheckSquare size={12} style={{ color: 'white' }} />}
            </div>
            <span
              className="text-sm flex-1"
              style={{
                color: 'var(--color-ink)',
                textDecoration: isChecked ? 'line-through' : 'none',
                opacity: isChecked ? 0.6 : 1,
              }}
            >
              {item.text}
            </span>
          </button>
        )
      })}
    </div>
  )
}