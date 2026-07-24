'use client'
import { useState } from 'react'
import type { InboxEntry, Project, ProductivityPriority } from '@/lib/team/types'
import VoiceButton from '@/components/VoiceButton'
import { Inbox as InboxIcon, Mic, Type, ArrowRight, Check, Sparkles, Plus, Clock } from 'lucide-react'

interface InboxProps {
  entries: InboxEntry[]
  projects: Project[]
  onCapture: (rawText: string, source: 'texto' | 'audio') => void
  onConvert: (entryId: string, input: { projectId: string; title: string; priority: ProductivityPriority; dueDate: string | null }) => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

const PRIORITY_OPTIONS: { value: ProductivityPriority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

export default function InboxView({ entries, projects, onCapture, onConvert }: InboxProps) {
  const [text, setText] = useState('')
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    title: string
    projectId: string
    priority: ProductivityPriority
    dueDate: string
  }>({
    title: '',
    projectId: '',
    priority: 'media',
    dueDate: '',
  })

  function handleCapture() {
    const trimmed = text.trim()
    if (!trimmed) return
    onCapture(trimmed, 'texto')
    setText('')
  }

  function handleVoice(transcript: string) {
    setText(prev => (prev ? prev + ' ' + transcript : transcript))
  }

  function startConverting(entry: InboxEntry) {
    setConvertingId(entry.id)
    setForm({
      title: truncate(entry.rawText, 60),
      projectId: entry.suggestedProjectId || projects[0]?.id || '',
      priority: entry.suggestedPriority || 'media',
      dueDate: entry.suggestedDueDate || '',
    })
  }

  function handleConvert(entryId: string) {
    onConvert(entryId, {
      projectId: form.projectId,
      title: form.title.trim(),
      priority: form.priority,
      dueDate: form.dueDate || null,
    })
    setConvertingId(null)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCapture()
    }
  }

  return (
    <div className="space-y-4">
      {/* Capture bar */}
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Captura una idea o tarea rapida..."
          className="w-full text-[13px] text-[#1a1a1a] placeholder:text-[#8a8680] bg-transparent resize-none focus:outline-none mb-2"
        />
        <div className="flex items-center justify-between gap-2">
          <VoiceButton
            onTranscript={handleVoice}
            label="Dictar"
            listeningLabel="Parar"
            className="!px-2.5 !py-1.5 !rounded-md !text-[12px]"
          />
          <button
            onClick={handleCapture}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 bg-[#7A1832] text-white text-[12.5px] font-medium px-3 py-1.5 rounded-md hover:bg-[#591427] disabled:opacity-40 transition-colors"
          >
            <Sparkles size={13} /> Capturar
          </button>
        </div>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center">
          <InboxIcon className="mx-auto mb-2 text-[#8a8680]" size={28} />
          <p className="text-[13px] font-medium text-[#1a1a1a] mb-1">Bandeja vacia</p>
          <p className="text-[12px] text-[#8a8680]">
            Captura ideas rapidas arriba. Luego convertiras las que importen en tareas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const isConverting = convertingId === entry.id
            const isConverted = !!entry.convertedToTaskId
            return (
              <div key={entry.id} className="bg-white rounded-xl border border-[#FFF1B5] p-3">
                <div className="flex items-start gap-2.5">
                  {/* Source icon */}
                  <div className="shrink-0 mt-0.5">
                    {entry.source === 'audio' ? (
                      <div className="w-7 h-7 rounded-lg bg-[#7A1832] flex items-center justify-center">
                        <Mic size={13} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-[#FFF1B5] flex items-center justify-center">
                        <Type size={13} className="text-[#8a8680]" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#1a1a1a] leading-snug whitespace-pre-wrap">
                      {entry.rawText}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-[#8a8680] flex items-center gap-1">
                        <Clock size={10} /> {relativeTime(entry.createdAt)}
                      </span>
                    </div>

                    {/* Converted badge */}
                    {isConverted ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-[#EBFBEE] border border-[#2f9e44] text-[#2f9e44] text-[11.5px] font-medium px-2.5 py-1 rounded-md">
                        <Check size={12} /> Convertida en tarea
                      </div>
                    ) : !isConverting ? (
                      <button
                        onClick={() => startConverting(entry)}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#7A1832] hover:text-[#591427] transition-colors"
                      >
                        <ArrowRight size={12} /> Convertir en tarea
                      </button>
                    ) : (
                      <div className="mt-3 bg-[#FFFDF5] rounded-lg border border-[#FFF1B5] p-3 space-y-2.5">
                        <input
                          type="text"
                          value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Titulo de la tarea"
                          className="w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={form.projectId}
                            onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                            className="px-2.5 py-1.5 text-[12px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                          >
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <select
                            value={form.priority}
                            onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProductivityPriority }))}
                            className="px-2.5 py-1.5 text-[12px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                          >
                            {PRIORITY_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={form.dueDate}
                            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="px-2.5 py-1.5 text-[12px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConvert(entry.id)}
                            disabled={!form.title.trim() || !form.projectId}
                            className="flex items-center gap-1.5 bg-[#7A1832] text-white text-[12px] font-medium px-3 py-1.5 rounded-md hover:bg-[#591427] disabled:opacity-40 transition-colors"
                          >
                            <Plus size={13} /> Crear tarea
                          </button>
                          <button
                            onClick={() => setConvertingId(null)}
                            className="text-[12px] text-[#8a8680] hover:text-[#1a1a1a] px-2 py-1.5 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}