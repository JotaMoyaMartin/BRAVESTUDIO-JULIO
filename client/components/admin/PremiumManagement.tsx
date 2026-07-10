'use client'
import { useState, useEffect } from 'react'
import { Profile, ContentItem } from '@/types/database'
import { Sparkles, Film, LayoutGrid, FileText, Trash2, Plus, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  user: Profile
}

export default function PremiumManagement({ user }: Props) {
  const [transcription, setTranscription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [strategyStatus, setStrategyStatus] = useState<'loading' | 'exists' | 'none' | 'generated'>('loading')
  const [error, setError] = useState('')

  // Script creation state
  const [scripts, setScripts] = useState<ContentItem[]>([])
  const [loadingScripts, setLoadingScripts] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newScript, setNewScript] = useState({
    type: 'reel' as 'reel' | 'carrusel' | 'story',
    service: '',
    title: '',
    hook: '',
    context: '',
    solution: '',
    cta: '',
    visualIdea: '',
  })
  const [savingScript, setSavingScript] = useState(false)

  // Check if strategy exists
  useEffect(() => {
    async function checkStrategy() {
      try {
        const res = await fetch(`/api/admin/premium-scripts?userId=${user.id}`)
        const data = await res.json()
        setScripts(data.items || [])
        setLoadingScripts(false)
      } catch {
        setLoadingScripts(false)
      }
    }
    checkStrategy()
  }, [user.id])

  async function generateStrategy() {
    if (!transcription.trim()) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/premium-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, transcription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar estrategia')
      setStrategyStatus('generated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setGenerating(false)
    }
  }

  async function createScript() {
    if (!newScript.title.trim()) return
    setSavingScript(true)
    setError('')
    try {
      const contentJson = newScript.type === 'reel'
        ? { script: { hook: newScript.hook, context: newScript.context, solution: newScript.solution, cta: newScript.cta } }
        : newScript.type === 'carrusel'
        ? { slides: [{ number: 1, role: 'Gancho', text: newScript.hook }, { number: 2, role: 'Contexto', text: newScript.context }, { number: 3, role: 'Solución', text: newScript.solution }, { number: 4, role: 'CTA', text: newScript.cta }] }
        : { text: newScript.hook }

      const res = await fetch('/api/admin/premium-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: newScript.type,
          title: newScript.title,
          service: newScript.service || undefined,
          contentJson,
          visualIdea: newScript.visualIdea || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear guion')
      setScripts(prev => [data.item, ...prev])
      setNewScript({ type: 'reel', service: '', title: '', hook: '', context: '', solution: '', cta: '', visualIdea: '' })
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSavingScript(false)
    }
  }

  async function deleteScript(itemId: string) {
    try {
      await fetch(`/api/admin/premium-scripts?itemId=${itemId}`, { method: 'DELETE' })
      setScripts(prev => prev.filter(s => s.id !== itemId))
    } catch {
      // ignore
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'
  const labelClass = 'block text-xs font-semibold text-cherry-dark opacity-70 mb-1'

  return (
    <div className="space-y-6">
      {/* Estrategia */}
      <section>
        <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2 flex items-center gap-1.5">
          <Sparkles size={12} /> Estrategia Premium
        </h4>
        <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-3">
          {strategyStatus === 'generated' && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-[var(--radius-sm)] px-3 py-2">
              <CheckCircle2 size={16} />
              <span>Estrategia generada. El cliente ya puede verla en "Mi Estrategia".</span>
            </div>
          )}
          <p className="text-xs text-cherry-dark opacity-70">
            Pega la transcripción de la videollamada con el cliente. La IA generará la ficha estratégica completa.
          </p>
          <textarea
            value={transcription}
            onChange={e => setTranscription(e.target.value)}
            rows={8}
            placeholder="Pega aquí toda la transcripción de la videollamada con el cliente..."
            className={inputClass}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
          <button
            onClick={generateStrategy}
            disabled={generating || !transcription.trim()}
            className="btn-primary w-full justify-center text-sm py-2.5"
            style={{ opacity: !transcription.trim() ? 0.5 : 1 }}
          >
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generando estrategia...</> : <><Sparkles size={14} /> Generar estrategia</>}
          </button>
        </div>
      </section>

      {/* Plan de Contenidos */}
      <section>
        <h4 className="text-xs uppercase tracking-wide text-cherry-dark opacity-60 mb-2 flex items-center gap-1.5">
          <Film size={12} /> Plan de Contenidos
        </h4>
        <div className="rounded-[var(--radius-md)] bg-white p-4 border border-soft space-y-3">
          {loadingScripts ? (
            <p className="text-xs text-cherry-dark opacity-50">Cargando guiones...</p>
          ) : scripts.length === 0 ? (
            <p className="text-xs text-cherry-dark opacity-50">No hay guiones asignados todavía.</p>
          ) : (
            <div className="space-y-2">
              {scripts.map(script => (
                <div key={script.id} className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-cream">
                  {script.type === 'reel' ? <Film size={14} className="text-cherry" /> : script.type === 'carrusel' ? <LayoutGrid size={14} className="text-cherry" /> : <FileText size={14} className="text-cherry" />}
                  <span className="flex-1 text-xs font-medium text-cherry-dark truncate">{script.title}</span>
                  {script.status === 'done' && <span className="text-xs text-green-700">✓</span>}
                  <button
                    onClick={() => deleteScript(script.id)}
                    className="p-1 rounded text-cherry-dark opacity-40 hover:opacity-70"
                    title="Eliminar guion"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <div className="space-y-3 pt-2 border-t border-soft">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select
                    value={newScript.type}
                    onChange={e => setNewScript(prev => ({ ...prev, type: e.target.value as typeof prev.type }))}
                    className={inputClass}
                  >
                    <option value="reel">Reel</option>
                    <option value="carrusel">Carrusel</option>
                    <option value="story">Story</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Servicio</label>
                  <input
                    value={newScript.service}
                    onChange={e => setNewScript(prev => ({ ...prev, service: e.target.value }))}
                    className={inputClass}
                    placeholder="Balayage..."
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Título *</label>
                <input
                  value={newScript.title}
                  onChange={e => setNewScript(prev => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Reel: Antes y después balayage"
                />
              </div>
              <div>
                <label className={labelClass}>Gancho</label>
                <textarea value={newScript.hook} onChange={e => setNewScript(prev => ({ ...prev, hook: e.target.value }))} rows={2} className={inputClass} placeholder="Primera frase que engancha..." />
              </div>
              <div>
                <label className={labelClass}>Contexto</label>
                <textarea value={newScript.context} onChange={e => setNewScript(prev => ({ ...prev, context: e.target.value }))} rows={2} className={inputClass} placeholder="Desarrollo del tema..." />
              </div>
              <div>
                <label className={labelClass}>Solución</label>
                <textarea value={newScript.solution} onChange={e => setNewScript(prev => ({ ...prev, solution: e.target.value }))} rows={2} className={inputClass} placeholder="La solución o el valor..." />
              </div>
              <div>
                <label className={labelClass}>CTA</label>
                <textarea value={newScript.cta} onChange={e => setNewScript(prev => ({ ...prev, cta: e.target.value }))} rows={2} className={inputClass} placeholder="Llamada a la acción conversacional..." />
              </div>
              <div>
                <label className={labelClass}>Idea visual</label>
                <input value={newScript.visualIdea} onChange={e => setNewScript(prev => ({ ...prev, visualIdea: e.target.value }))} className={inputClass} placeholder="Selfie, espejo, resultado en movimiento..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-warm-gray text-cherry-dark hover:opacity-80">
                  Cancelar
                </button>
                <button
                  onClick={createScript}
                  disabled={savingScript || !newScript.title.trim()}
                  className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-cherry text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingScript ? 'Guardando...' : 'Guardar guion'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-semibold bg-buttermilk text-cherry-dark hover:opacity-80"
            >
              <Plus size={14} /> Crear nuevo guion
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}
    </div>
  )
}