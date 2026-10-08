'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutTemplate, Plus, Trash2, Code, ChevronDown, ChevronUp, AlertTriangle,
  Archive, ArchiveRestore, Copy, Palette,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionTitle from '@/components/ui/SectionTitle'
import StoriesBuilder, { firstSlideOf } from '@/components/admin/StoriesBuilder'
import SlideCanvas, { CANVAS_H, CANVAS_W } from '@/app/(app)/stories-diseno/SlideCanvas'

/* STORIES DISEÑO — tab de admin (Fase 2).
 * Packs de plantillas que se crean/publican aquí y se usan en /stories-diseno.
 * La publicación es en dos niveles: el pack entero se publica/despublica
 * (published) y cada plantilla va por su propio status (draft | published).
 */

// Tipos locales con el contrato exacto de /api/stories-diseno/admin (snake_case de la DB)
type StoriesGoal = 'vender' | 'captar' | 'educar' | 'fidelizar' | 'autoridad'
type PackFlowType = 'single-goal' | 'sequence-launch' | 'nurture' | 'capture'
type TemplateStatus = 'draft' | 'published' | 'archived'

type StoriesTemplate = {
  id: string
  pack_id: string
  slug: string
  title: string
  category: string
  description: string
  recommended_use: string | null
  cover_image: string | null
  is_locked: boolean | null
  status: TemplateStatus
  sort: number | null
  tags: string[] | null
  default_style: Record<string, string | number> | null
  slides: unknown[]
  created_at: string
  updated_at: string
}

type StoriesPack = {
  id: string
  slug: string
  title: string
  goal: StoriesGoal
  description: string
  flow_type: PackFlowType | null
  story_count: number | null
  published: boolean
  sort: number | null
  created_at: string
  updated_at: string
  templates: StoriesTemplate[]
}

type BadgeTone = 'cherry' | 'buttermilk' | 'blue' | 'green' | 'danger' | 'neutral'

const GOALS: StoriesGoal[] = ['vender', 'captar', 'educar', 'fidelizar', 'autoridad']

// Color del badge según el objetivo editorial del pack
const GOAL_TONES: Record<StoriesGoal, BadgeTone> = {
  vender: 'cherry',
  captar: 'blue',
  educar: 'buttermilk',
  fidelizar: 'green',
  autoridad: 'neutral',
}

const FLOW_TYPES: { value: PackFlowType; label: string }[] = [
  { value: 'single-goal', label: 'Objetivo único' },
  { value: 'sequence-launch', label: 'Secuencia lanzamiento' },
  { value: 'nurture', label: 'Seguimiento' },
  { value: 'capture', label: 'Captación' },
]

type NewPackForm = { title: string; goal: StoriesGoal | ''; description: string; flowType: PackFlowType }

const EMPTY_FORM: NewPackForm = { title: '', goal: '', description: '', flowType: 'single-goal' }

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

/* Miniatura real del slide 1 (render del mismo SlideCanvas que la galería) */
const THUMB_H = 72
const THUMB_SCALE = THUMB_H / CANVAS_H

function TemplateThumb({ slides, templateId }: { slides: unknown[]; templateId: string }) {
  const slide = firstSlideOf(slides, templateId)
  if (!slide) {
    return (
      <div
        className="flex-shrink-0 rounded-[3px] border border-soft bg-warm-gray flex items-center justify-center"
        style={{ width: Math.round(CANVAS_W * THUMB_SCALE), height: THUMB_H }}
      >
        <LayoutTemplate size={14} className="opacity-40" />
      </div>
    )
  }
  return (
    <div
      className="flex-shrink-0 overflow-hidden rounded-[3px] border border-soft"
      style={{ width: CANVAS_W * THUMB_SCALE, height: THUMB_H }}
    >
      <SlideCanvas slide={slide} scale={THUMB_SCALE} />
    </div>
  )
}

export default function StoriesTab() {
  const [packs, setPacks] = useState<StoriesPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState('') // "X creados, Y ya existían"
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<NewPackForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null) // pack desplegado
  const [editingSlides, setEditingSlides] = useState<{ templateId: string; text: string } | null>(null)
  const [slidesError, setSlidesError] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null) // "pack:{id}" | "template:{id}" — segunda pulsación confirma
  const [builder, setBuilder] = useState<{ templateId: string; title: string; slides: unknown[] } | null>(null)
  const [newTpl, setNewTpl] = useState<{ packId: string; title: string } | null>(null) // form "plantilla en blanco"
  const [creatingTpl, setCreatingTpl] = useState(false)
  const [newTplError, setNewTplError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api('/api/stories-diseno/admin')
      setPacks((data.packs as StoriesPack[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setShowCreate(true)
    setError('')
    setSeedResult('')
    setConfirming(null)
  }

  /** POST action:'seed' — generación idempotente de los packs iniciales. */
  async function seed() {
    setSeeding(true)
    setError('')
    setSeedResult('')
    try {
      const data = await api('/api/stories-diseno/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      setSeedResult(`${data.created} creados, ${data.skipped} ya existían`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando packs')
    } finally {
      setSeeding(false)
    }
  }

  /** POST action:'create-pack' — pack vacío; las plantillas se añaden después. */
  async function createPack(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api('/api/stories-diseno/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-pack',
          title: form.title.trim(),
          goal: form.goal,
          description: form.description,
          flowType: form.flowType,
        }),
      })
      setShowCreate(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando pack')
    } finally {
      setSaving(false)
    }
  }

  /** POST action:'create-template' — plantilla en blanco dentro del pack indicado. */
  async function createTemplateBlank() {
    if (!newTpl) return
    if (!newTpl.title.trim()) {
      setNewTplError('Escribe un título')
      return
    }
    const packId = newTpl.packId
    setCreatingTpl(true)
    setNewTplError('')
    try {
      await api('/api/stories-diseno/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-template', packId, title: newTpl.title.trim() }),
      })
      await load()
      setNewTpl(null)
    } catch (e) {
      setNewTplError(e instanceof Error ? e.message : 'Error creando plantilla')
    } finally {
      setCreatingTpl(false)
    }
  }

  // Actualiza una plantilla en todos los packs (la lista va embebida)
  function patchLocalTemplate(id: string, changes: Partial<StoriesTemplate>) {
    setPacks(prev => prev.map(p => ({ ...p, templates: p.templates.map(t => (t.id === id ? { ...t, ...changes } : t)) })))
  }

  function removeLocalTemplate(id: string) {
    setPacks(prev => prev.map(p => ({ ...p, templates: p.templates.filter(t => t.id !== id) })))
  }

  async function togglePack(pack: StoriesPack) {
    // Publicar/despublicar el pack entero
    try {
      await api(`/api/stories-diseno/admin/packs/${pack.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !pack.published }),
      })
      setPacks(prev => prev.map(p => (p.id === pack.id ? { ...p, published: !pack.published } : p)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  async function deletePack(pack: StoriesPack) {
    if (!confirming || confirming !== `pack:${pack.id}`) return
    setSaving(true)
    try {
      await api(`/api/stories-diseno/admin/packs/${pack.id}`, { method: 'DELETE' })
      if (expanded === pack.id) setExpanded(null)
      if (editingSlides && pack.templates.some(t => t.id === editingSlides.templateId)) setEditingSlides(null)
      setConfirming(null)
      setPacks(prev => prev.filter(p => p.id !== pack.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleTemplate(t: StoriesTemplate) {
    // Las plantillas sueltas van por status: draft <-> published; archived vuelve a published
    const next: TemplateStatus = t.status === 'published' ? 'draft' : 'published'
    try {
      await api(`/api/stories-diseno/admin/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      patchLocalTemplate(t.id, { status: next })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  /** Archiva (draft/published → archived) o restaura (archived → draft). */
  async function toggleArchive(t: StoriesTemplate) {
    const next: TemplateStatus = t.status === 'archived' ? 'draft' : 'archived'
    try {
      await api(`/api/stories-diseno/admin/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      patchLocalTemplate(t.id, { status: next })
      if (editingSlides?.templateId === t.id) setEditingSlides(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  /** POST duplicar plantilla (copia en draft) → refresca la lista. */
  async function duplicateTemplate(t: StoriesTemplate) {
    setSaving(true)
    setError('')
    try {
      await api(`/api/stories-diseno/admin/templates/${t.id}`, { method: 'POST' })
      setConfirming(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error duplicando plantilla')
    } finally {
      setSaving(false)
    }
  }

  function openBuilder(t: StoriesTemplate) {
    setConfirming(null)
    setEditingSlides(null)
    setBuilder({ templateId: t.id, title: t.title, slides: Array.isArray(t.slides) ? t.slides : [] })
  }

  function openSlides(t: StoriesTemplate) {
    setEditingSlides({ templateId: t.id, text: JSON.stringify(t.slides ?? [], null, 2) })
    setSlidesError('')
    setConfirming(null)
  }

  /** Guarda los slides: parsea con try/catch; si falla no envía nada. */
  async function saveSlides() {
    if (!editingSlides) return
    let parsed: unknown
    try {
      parsed = JSON.parse(editingSlides.text)
    } catch (err) {
      setSlidesError('JSON no válido: ' + (err instanceof Error ? err.message : 'error de parseo'))
      return
    }
    if (!Array.isArray(parsed)) {
      setSlidesError('Los slides deben ser un array (p.ej. [{ order: 1, background: …, layoutType: …, elements: [] }]).')
      return
    }
    setSaving(true)
    setSlidesError('')
    try {
      await api(`/api/stories-diseno/admin/templates/${editingSlides.templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: parsed }),
      })
      patchLocalTemplate(editingSlides.templateId, { slides: parsed as unknown[] })
      setEditingSlides(null)
    } catch (e) {
      setSlidesError(e instanceof Error ? e.message : 'Error guardando slides')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(t: StoriesTemplate) {
    if (!confirming || confirming !== `template:${t.id}`) return
    setSaving(true)
    try {
      await api(`/api/stories-diseno/admin/templates/${t.id}`, { method: 'DELETE' })
      if (editingSlides?.templateId === t.id) setEditingSlides(null)
      setConfirming(null)
      removeLocalTemplate(t.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'
  const labelStyle = 'block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 mb-1'

  return (
    <div className="space-y-4">
      {error && packs.length > 0 && !showCreate && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}

      {/* CUSTOM EDITOR — PAUSED (8-oct-2026): se congela esta línea para validar
          arquitectura Canva + Data Autofill. El código queda intacto (commit adadad1). */}
      <div className="rounded-[var(--radius-md)] p-4" style={{ background: 'var(--color-buttermilk)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} style={{ color: 'var(--color-cherry)', flexShrink: 0, marginTop: 2 }} />
          <div className="space-y-1">
            <p className="text-sm font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
              Editor visual propio — PAUSED
            </p>
            <p className="text-xs" style={{ color: 'var(--color-cherry-dark)' }}>
              Congelado para validar la nueva arquitectura de plantillas con Canva (Data Autofill + REST APIs). El código queda intacto y las plantillas publicadas siguen visibles en /stories-diseno. Probar: <strong>/admin/canva-test</strong>
            </p>
          </div>
        </div>
      </div>

      <SectionTitle
        title="Stories Diseño"
        subtitle="Packs y plantillas para /stories-diseno. Se publica un pack entero; las plantillas sueltas van por status."
        icon={<LayoutTemplate size={18} />}
        action={
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="secondary" loading={seeding} disabled={loading} onClick={seed}>
              Generar packs iniciales
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
              Nuevo pack
            </Button>
          </div>
        }
      />

      {seedResult && (
        <div className="flex items-center gap-2">
          <Badge tone="green">{seedResult}</Badge>
        </div>
      )}

      {/* Mini form inline para crear un pack vacío */}
      {showCreate && (
        <Card>
          <form onSubmit={createPack} className="space-y-3">
            {error && (
              <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
            )}

            <div>
              <label className={labelStyle}>Título *</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Secuencia para llenar la agenda"
                className={fieldStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelStyle}>Objetivo *</label>
                <select
                  required
                  value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value as StoriesGoal | '' }))}
                  className={fieldStyle + ' cursor-pointer'}
                >
                  <option value="" disabled>Elige objetivo…</option>
                  {GOALS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Tipo de flujo</label>
                <select
                  value={form.flowType}
                  onChange={e => setForm(f => ({ ...f, flowType: e.target.value as PackFlowType }))}
                  className={fieldStyle + ' cursor-pointer'}
                >
                  {FLOW_TYPES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelStyle}>Descripción *</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Para qué sirve esta secuencia y cuándo usarla"
                className={fieldStyle}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={saving}>Crear pack</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Card>
          <p className="px-6 py-8 text-sm text-center text-cherry-dark opacity-50">Cargando…</p>
        </Card>
      ) : error && packs.length === 0 ? (
        <Card>
          <div className="px-6 py-10 space-y-3 text-center">
            <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
            <Button size="sm" onClick={() => { setError(''); load() }}>Reintentar</Button>
          </div>
        </Card>
      ) : packs.length === 0 ? (
        <Card>
          <div className="px-6 py-10 space-y-4 text-center">
            <p className="text-sm text-cherry-dark opacity-70">No hay packs aún — empieza generando los packs iniciales</p>
            <Button loading={seeding} onClick={seed}>Generar packs iniciales</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map((p, i) => {
            const isConfirming = confirming === `pack:${p.id}`
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="h-full"
              >
                <Card className="h-full flex flex-col p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-cherry-dark">{p.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge tone={GOAL_TONES[p.goal] ?? 'neutral'}>{p.goal}</Badge>
                        <Badge tone={p.published ? 'green' : 'buttermilk'}>{p.published ? 'Publicado' : 'Borrador'}</Badge>
                        <Badge tone="neutral">
                          {p.templates.length} {p.templates.length === 1 ? 'plantilla' : 'plantillas'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-cherry-dark opacity-60 mt-2 line-clamp-2">{p.description}</p>

                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="flex w-full items-center justify-between mt-3 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-cherry-dark"
                    style={{ background: 'var(--color-warm-gray)' }}
                  >
                    <span>Plantillas ({p.templates.length})</span>
                    {expanded === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* Plantillas del pack (collapsible) */}
                  {expanded === p.id && (
                    <div className="mt-2 p-3 rounded-[var(--radius-sm)] border border-soft bg-cream">
                      {/* "+ Plantilla en blanco": botón (o el form inline si está abierto para este pack) */}
                      {(!newTpl || newTpl.packId !== p.id) && (
                        <div className="flex justify-end mb-1.5">
                          <button
                            onClick={() => { setNewTpl({ packId: p.id, title: '' }); setNewTplError('') }}
                            disabled={creatingTpl}
                            className="text-[11px] font-semibold px-2 py-1 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:bg-buttermilk transition-colors disabled:opacity-40"
                            title="Crear una plantilla vacía en este pack"
                          >
                            + Plantilla en blanco
                          </button>
                        </div>
                      )}
                      {newTpl && newTpl.packId === p.id && (
                        <div className="mb-3 p-2.5 rounded-[var(--radius-sm)] border border-soft bg-warm-gray space-y-2">
                          <label className={labelStyle}>Nueva plantilla en blanco</label>
                          <input
                            type="text"
                            value={newTpl.title}
                            onChange={e => setNewTpl(s => (s ? { ...s, title: e.target.value } : s))}
                            placeholder="Ej: Portada promo extensiones"
                            className={fieldStyle}
                            disabled={creatingTpl}
                          />
                          {newTplError && (
                            <div className="rounded-[var(--radius-sm)] p-2 text-xs bg-[#fde8e8] text-danger">{newTplError}</div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" loading={creatingTpl} onClick={createTemplateBlank}>Crear</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setNewTpl(null); setNewTplError('') }}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                      {p.templates.length === 0 ? (
                        <p className="py-3 text-xs text-center text-cherry-dark opacity-50">Sin plantillas todavía.</p>
                      ) : (
                        <div className="divide-y border-soft">
                          {p.templates.map(t => {
                            const isConfirmingT = confirming === `template:${t.id}`
                            return (
                              <div key={t.id} className="py-2.5 first:pt-1 last:pb-0">
                                <div className="flex items-start gap-2.5">
                                  <TemplateThumb slides={t.slides ?? []} templateId={t.id} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-cherry-dark truncate">{t.title}</p>
                                    <p className="text-xs text-cherry-dark opacity-50 mt-0.5 truncate">{t.category}</p>
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 flex-shrink-0 flex-wrap">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      icon={<Palette size={13} />}
                                      onClick={() => openBuilder(t)}
                                      title="Diseñar en el builder visual"
                                    >
                                      Diseñar
                                    </Button>
                                    <button onClick={() => toggleTemplate(t)} title="Cambiar estado (archivada → publicada)">
                                      <Badge tone={t.status === 'published' ? 'green' : t.status === 'archived' ? 'buttermilk' : 'neutral'}>
                                        {t.status === 'published' ? 'Publicada' : t.status === 'archived' ? 'Archivado' : 'Borrador'}
                                      </Badge>
                                    </button>
                                    <button
                                      onClick={() => duplicateTemplate(t)}
                                      disabled={saving}
                                      className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:opacity-80 disabled:opacity-40"
                                      title="Duplicar plantilla"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      onClick={() => toggleArchive(t)}
                                      className="p-1.5 rounded-[var(--radius-sm)] bg-warm-gray text-cherry-dark hover:opacity-80"
                                      title={t.status === 'archived' ? 'Desarchivar (a borrador)' : 'Archivar'}
                                    >
                                      {t.status === 'archived' ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                                    </button>
                                    <button
                                      onClick={() => openSlides(t)}
                                      className="p-1.5 rounded-[var(--radius-sm)] bg-[rgba(67,56,202,0.08)] text-[#4338ca] hover:bg-[rgba(67,56,202,0.15)]"
                                      title="Editar slides"
                                    >
                                      <Code size={13} />
                                    </button>
                                    <button
                                      onClick={() => (isConfirmingT ? deleteTemplate(t) : setConfirming(`template:${t.id}`))}
                                      className="p-1.5 rounded-[var(--radius-sm)] bg-[#fde8e8] text-danger hover:opacity-80"
                                      title={isConfirmingT ? 'Pulsa otra vez para confirmar' : 'Eliminar'}
                                    >
                                      {isConfirmingT ? <AlertTriangle size={13} /> : <Trash2 size={13} />}
                                    </button>
                                  </div>
                                </div>

                                {/* Editor de slides (JSON) */}
                                {editingSlides?.templateId === t.id && (
                                  <div className="mt-3 space-y-2">
                                    <label className={labelStyle}>
                                      Slides (JSON — {'{ order, background, layoutType, elements[] }'})
                                    </label>
                                    <textarea
                                      rows={12}
                                      value={editingSlides.text}
                                      onChange={e => setEditingSlides(s => s ? { ...s, text: e.target.value } : s)}
                                      className={fieldStyle + ' font-mono text-xs'}
                                    />
                                    {slidesError && (
                                      <div className="rounded-[var(--radius-sm)] p-2 text-xs bg-[#fde8e8] text-danger">{slidesError}</div>
                                    )}
                                    <div className="flex gap-2">
                                      <Button size="sm" loading={saving} onClick={saveSlides}>Guardar slides</Button>
                                      <Button size="sm" variant="secondary" onClick={() => { setEditingSlides(null); setSlidesError('') }}>Cancelar</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 mt-auto">
                    <Button size="sm" variant="secondary" onClick={() => togglePack(p)}>
                      {p.published ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button
                      size="sm"
                      variant={isConfirming ? 'danger' : 'ghost'}
                      onClick={() => (isConfirming ? deletePack(p) : setConfirming(`pack:${p.id}`))}
                    >
                      {isConfirming ? '¿Seguro?' : 'Eliminar'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Builder visual de la plantilla (full-screen) */}
      {builder && (
        <StoriesBuilder
          key={builder.templateId}
          templateId={builder.templateId}
          title={builder.title}
          initialSlides={builder.slides}
          onClose={() => setBuilder(null)}
          onSaved={savedSlides => patchLocalTemplate(builder.templateId, { slides: savedSlides })}
          onStatusChange={next => patchLocalTemplate(builder.templateId, { status: next as StoriesTemplate['status'] })}
        />
      )}
    </div>
  )
}