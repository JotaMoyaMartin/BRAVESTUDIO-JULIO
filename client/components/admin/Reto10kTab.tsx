'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Save, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionTitle from '@/components/ui/SectionTitle'
import { Reto10kConfig, RetoPhase, RetoMission } from '@/types/reto10k'

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

const DEFAULT_CONFIG: Reto10kConfig = {
  phases: [
    { order: 1, emoji: '🌱', title: 'Pierde el miedo y empieza a mostrarte', objective: 'Crear confianza delante de cámara', content: ['Mi historia', 'Mi experiencia', 'Mi salón', 'Por qué elegí esta profesión', 'Mi filosofía'] },
    { order: 2, emoji: '✨', title: 'Construye tu autoridad', objective: 'Demostrar conocimiento', content: ['Consejos profesionales', 'Errores frecuentes', 'Educación', 'Mitos', 'Opiniones profesionales'] },
    { order: 3, emoji: '🔥', title: 'Genera deseo con resultados', objective: 'Mostrar el valor del trabajo', content: ['Antes y después', 'Transformaciones', 'Casos reales', 'Procesos', 'Testimonios'] },
    { order: 4, emoji: '🚀', title: 'Conviértete en referente', objective: 'Crear comunidad', content: ['Tendencias', 'Contenido viral', 'Opiniones', 'Conversaciones', 'Marca personal'] },
  ],
  missions: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    phase: i < 8 ? 1 : i < 15 ? 2 : i < 23 ? 3 : 4,
    title: `Misión día ${i + 1}`,
    description: 'Descripción de la misión',
    prompt_hint: 'Ideas de contenido para esta misión',
  })),
  braviMessages: {
    start: ['¡Hoy empieza tu transformación!'],
    day: ['¡Día {day}! Misión de hoy: {mission}.'],
    week: ['¡Nueva semana del Reto!'],
    phase: ['¡Nueva fase! {phase}.'],
    complete: ['¡Completaste el Reto 10K!'],
    streak: ['¡{streak} días seguidos!'],
  },
}

export default function Reto10kTab() {
  const [config, setConfig] = useState<Reto10kConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api('/api/admin/reto-10k')
      if (data.config) {
        setConfig(data.config as Reto10kConfig)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api('/api/admin/reto-10k', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_json: config }),
      })
      setSuccess('Configuración guardada correctamente')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  function updatePhase(idx: number, field: keyof RetoPhase, value: any) {
    setConfig(prev => {
      const phases = [...prev.phases]
      phases[idx] = { ...phases[idx], [field]: value }
      return { ...prev, phases }
    })
  }

  function updateMission(idx: number, field: keyof RetoMission, value: any) {
    setConfig(prev => {
      const missions = [...prev.missions]
      missions[idx] = { ...missions[idx], [field]: value }
      return { ...prev, missions }
    })
  }

  function updateBraviMsgs(cat: string, idx: number, value: string) {
    setConfig(prev => {
      const braviMessages = { ...prev.braviMessages }
      const arr = [...(braviMessages as any)[cat]]
      arr[idx] = value
      ;(braviMessages as any)[cat] = arr
      return { ...prev, braviMessages }
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionTitle title="Reto 10K" subtitle="Configuración del Reto" icon={<Rocket size={18} />} />
        <Card padding="md">
          <p className="text-sm text-cherry-dark opacity-50">Cargando...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}
      {success && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs" style={{ background: 'var(--color-pastel-green)', color: '#2a6a3a' }}>{success}</div>
      )}

      <SectionTitle
        title="Reto 10K"
        subtitle="Configuración del Reto 10K"
        icon={<Rocket size={18} />}
        action={
          <Button size="sm" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
            Guardar
          </Button>
        }
      />

      {/* Fases */}
      <Card padding="md" shadow="soft">
        <h3 className="font-bold text-sm text-cherry-dark mb-3">Fases del Reto</h3>
        <div className="space-y-3">
          {config.phases.map((phase, i) => (
            <PhaseEditor
              key={i}
              phase={phase}
              onChange={(field, value) => updatePhase(i, field, value)}
            />
          ))}
        </div>
      </Card>

      {/* Misiones */}
      <Card padding="md" shadow="soft">
        <h3 className="font-bold text-sm text-cherry-dark mb-3">Misiones (30)</h3>
        <div className="space-y-2">
          {config.missions.map((mission, i) => (
            <MissionEditor
              key={i}
              mission={mission}
              onChange={(field, value) => updateMission(i, field, value)}
            />
          ))}
        </div>
      </Card>

      {/* Bravi Messages */}
      <Card padding="md" shadow="soft">
        <h3 className="font-bold text-sm text-cherry-dark mb-3">Mensajes de Bravi</h3>
        <div className="space-y-4">
          {(['start', 'day', 'week', 'phase', 'complete', 'streak'] as const).map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wider text-cherry-dark opacity-70 mb-2">
                {cat}
              </p>
              <div className="space-y-1.5">
                {config.braviMessages[cat].map((msg, j) => (
                  <input
                    key={j}
                    value={msg}
                    onChange={e => updateBraviMsgs(cat, j, e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave}>
          Guardar configuración
        </Button>
      </div>
    </div>
  )
}

function PhaseEditor({ phase, onChange }: {
  phase: RetoPhase
  onChange: (field: keyof RetoPhase, value: any) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'

  return (
    <div
      className="rounded-[var(--radius-sm)] overflow-hidden"
      style={{ background: 'var(--color-warm-light)', border: '1.5px solid var(--color-buttermilk)' }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left"
      >
        <span className="text-xl">{phase.emoji}</span>
        <span className="font-semibold text-sm text-cherry-dark flex-1">
          Fase {phase.order}: {phase.title}
        </span>
        {expanded ? <ChevronUp size={16} className="text-cherry" /> : <ChevronDown size={16} className="text-cherry" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Emoji</label>
            <input value={phase.emoji} onChange={e => onChange('emoji', e.target.value)} className={fieldStyle} style={{ maxWidth: 80 }} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Título</label>
            <input value={phase.title} onChange={e => onChange('title', e.target.value)} className={fieldStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Objetivo</label>
            <input value={phase.objective} onChange={e => onChange('objective', e.target.value)} className={fieldStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1">Contenido (separado por comas)</label>
            <input
              value={phase.content.join(', ')}
              onChange={e => onChange('content', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
              className={fieldStyle}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MissionEditor({ mission, onChange }: {
  mission: RetoMission
  onChange: (field: keyof RetoMission, value: any) => void
}) {
  const fieldStyle = 'w-full px-2 py-1.5 text-xs bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'
  return (
    <div className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)]" style={{ background: 'var(--color-warm-light)' }}>
      <Badge tone="neutral">D{mission.day}</Badge>
      <Badge tone="cherry">F{mission.phase}</Badge>
      <input
        value={mission.title}
        onChange={e => onChange('title', e.target.value)}
        placeholder="Título de la misión"
        className={fieldStyle}
        style={{ flex: 2 }}
      />
      <input
        value={mission.description}
        onChange={e => onChange('description', e.target.value)}
        placeholder="Descripción"
        className={fieldStyle}
        style={{ flex: 3 }}
      />
      <input
        value={mission.prompt_hint}
        onChange={e => onChange('prompt_hint', e.target.value)}
        placeholder="Prompt hint"
        className={fieldStyle}
        style={{ flex: 3 }}
      />
    </div>
  )
}