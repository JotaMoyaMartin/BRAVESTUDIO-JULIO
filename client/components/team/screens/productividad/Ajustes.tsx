'use client'
import { useState } from 'react'
import type { ProductivitySettings } from '@/lib/team/types'
import { Settings, Clock, Bell, AlertTriangle, Plus, X, Save, Check } from 'lucide-react'

interface Props {
  settings: ProductivitySettings
  onUpdate: (patch: Partial<ProductivitySettings>) => void
}

export default function Ajustes({ settings, onUpdate }: Props) {
  const [presets, setPresets] = useState<number[]>(settings.pomodoroPresets)
  const [newPreset, setNewPreset] = useState('')
  const [saved, setSaved] = useState(false)

  function addPreset() {
    const n = parseInt(newPreset, 10)
    if (!n || n < 1 || n > 180 || presets.includes(n)) return
    const next = [...presets, n].sort((a, b) => a - b)
    setPresets(next)
    onUpdate({ pomodoroPresets: next })
    setNewPreset('')
  }

  function removePreset(n: number) {
    const next = presets.filter(p => p !== n)
    setPresets(next)
    onUpdate({ pomodoroPresets: next })
  }

  function save() {
    onUpdate({ pomodoroPresets: presets })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-[600px]">
      <h3 className="text-[14px] font-semibold text-[#1a1a1a] flex items-center gap-2"><Settings size={16} /> Ajustes de productividad</h3>

      {/* Pomodoro presets */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1a1a1a]"><Clock size={15} className="text-[#7A1832]" /> Presets de Pomodoro (min)</div>
        <div className="flex flex-wrap gap-2">
          {presets.map(n => (
            <div key={n} className="flex items-center gap-1 bg-[#FFF1B5] text-[#7A1832] text-[12px] px-2.5 py-1 rounded-full font-medium">
              {n} min
              <button onClick={() => removePreset(n)} className="hover:text-[#e03131]"><X size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={180} value={newPreset} onChange={e => setNewPreset(e.target.value)} placeholder="Nuevo preset" className="w-[110px] px-2.5 py-1.5 text-[12px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]" />
          <button onClick={addPreset} className="text-[12px] px-2.5 py-1.5 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] flex items-center gap-1"><Plus size={13} /> Añadir</button>
        </div>
      </div>

      {/* Default preset */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-2">
        <div className="text-[13px] font-semibold text-[#1a1a1a]">Preset por defecto</div>
        <select value={settings.defaultPreset} onChange={e => onUpdate({ defaultPreset: parseInt(e.target.value, 10) })} className="px-3 py-2 text-[12px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]">
          {presets.map(n => <option key={n} value={n}>{n} minutos</option>)}
        </select>
      </div>

      {/* Toggles */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-3">
        <Toggle
          icon={<Bell size={15} className="text-[#7A1832]" />}
          label="Recordatorios de enfoque"
          checked={settings.focusRemindersEnabled}
          onChange={v => onUpdate({ focusRemindersEnabled: v })}
        />
        <Toggle
          icon={<AlertTriangle size={15} className="text-[#f08c00]" />}
          label="Alerta de múltiples tareas en 'Ahora'"
          checked={settings.multiTaskAlertEnabled}
          onChange={v => onUpdate({ multiTaskAlertEnabled: v })}
        />
      </div>

      {/* Postpone threshold */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4 space-y-2">
        <div className="text-[13px] font-semibold text-[#1a1a1a] flex items-center gap-2"><AlertTriangle size={15} className="text-[#e03131]" /> Avisar al aplazar una tarea más de…</div>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={10} value={settings.postponeAlertThreshold} onChange={e => onUpdate({ postponeAlertThreshold: parseInt(e.target.value, 10) || 1 })} className="w-[80px] px-2.5 py-1.5 text-[12px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832]" />
          <span className="text-[12px] text-[#8a8680]">veces</span>
        </div>
      </div>

      <button onClick={save} className="text-[12.5px] px-3 py-2 rounded-lg bg-[#7A1832] text-white font-medium hover:bg-[#591427] flex items-center gap-1.5">
        {saved ? <><Check size={14} /> Guardado</> : <><Save size={14} /> Guardar cambios</>}
      </button>
    </div>
  )
}

function Toggle({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[12.5px] text-[#1a1a1a]">{icon} {label}</div>
      <button onClick={() => onChange(!checked)} className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[#7A1832]' : 'bg-[#e8e6e3]'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}