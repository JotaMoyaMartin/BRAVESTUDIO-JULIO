'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Loader2, Search, CheckCircle2, FileText, SendHorizonal, RotateCcw } from 'lucide-react'
import { PremiumStrategySession } from '@/types/database'
import { StrategyDocument } from '@/lib/strategy-types'
import { StrategyDisplay } from '@/components/mi-marca/StrategyDisplay'
import Card from '@/components/ui/Card'

interface ClientInfo {
  id: string
  email: string
  full_name: string | null
  salon_name: string | null
  lastSession: PremiumStrategySession | null
}

interface ChatMessage {
  role: 'admin' | 'assistant'
  content: string
  created_at: string
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export default function GestionPremiumTab() {
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [session, setSession] = useState<PremiumStrategySession | null>(null)
  const [transcription, setTranscription] = useState('')
  const [strategy, setStrategy] = useState<StrategyDocument | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [refining, setRefining] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [showTranscription, setShowTranscription] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  async function loadClients() {
    setLoading(true)
    try {
      const data = await api('/api/admin/premium-gestion')
      setClients((data.clients as ClientInfo[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando clientes')
    } finally {
      setLoading(false)
    }
  }

  function selectClient(client: ClientInfo) {
    setSelectedUserId(client.id)
    setError('')
    if (client.lastSession) {
      setSession(client.lastSession)
      setTranscription(client.lastSession.transcription || '')
      setStrategy(client.lastSession.strategy_draft as unknown as StrategyDocument)
      setChatMessages((client.lastSession.chat_messages as unknown as ChatMessage[]) || [])
    } else {
      setSession(null)
      setTranscription('')
      setStrategy(null)
      setChatMessages([])
    }
  }

  async function generateStrategy() {
    if (!selectedUserId || !transcription.trim()) return
    setGenerating(true)
    setError('')
    try {
      const data = await api('/api/admin/premium-gestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, transcription }),
      })
      setSession(data.session as PremiumStrategySession)
      setStrategy(data.strategy as StrategyDocument)
      setChatMessages([])
      // Refresh clients to update sidebar status
      loadClients()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando estrategia')
    } finally {
      setGenerating(false)
    }
  }

  async function sendChatMessage() {
    if (!session || !chatInput.trim() || refining) return
    const msg = chatInput.trim()
    setChatInput('')
    setRefining(true)
    setError('')
    try {
      const data = await api(`/api/admin/premium-gestion/${session.id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      setStrategy(data.strategy as StrategyDocument)
      setChatMessages(data.chatMessages as ChatMessage[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error refinando estrategia')
    } finally {
      setRefining(false)
    }
  }

  async function publish() {
    if (!session || publishing) return
    setPublishing(true)
    setError('')
    try {
      await api(`/api/admin/premium-gestion/${session.id}/publish`, { method: 'POST' })
      const updated = { ...session, status: 'published', published_at: new Date().toISOString() }
      setSession(updated)
      loadClients()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error publicando')
    } finally {
      setPublishing(false)
    }
  }

  function startNewDraft() {
    setSession(null)
    setStrategy(null)
    setChatMessages([])
    setTranscription('')
    setError('')
  }

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || (c.full_name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  const selectedClient = clients.find(c => c.id === selectedUserId)
  const isPublished = session?.status === 'published'

  const fieldStyle = 'w-full px-3 py-2 text-sm bg-cream border-[1.5px] border-soft focus:border-cherry rounded-[var(--radius-sm)] outline-none'

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-[var(--radius-sm)] p-3 text-xs bg-[#fde8e8] text-danger">{error}</div>
      )}

      <div className="flex gap-4" style={{ minHeight: 600 }}>
        {/* Left: client list */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry-dark opacity-40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className={fieldStyle + ' pl-9'}
            />
          </div>
          <div className="space-y-1.5 max-h-[560px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-center text-cherry-dark opacity-50 py-8">Cargando…</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-center text-cherry-dark opacity-50 py-8">No hay clientes premium</p>
            ) : (
              filteredClients.map(client => {
                const isSelected = client.id === selectedUserId
                const hasDraft = client.lastSession?.status === 'draft'
                const hasPublished = client.lastSession?.status === 'published'
                return (
                  <button
                    key={client.id}
                    onClick={() => selectClient(client)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--color-cherry)' : 'white',
                      border: isSelected ? 'none' : '1.5px solid var(--color-buttermilk)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(122,24,50,0.08)',
                        color: isSelected ? 'white' : 'var(--color-cherry)',
                      }}
                    >
                      {(client.full_name || client.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-cherry-dark'}`}>
                        {client.full_name || client.email}
                      </p>
                      <p className={`text-xs truncate ${isSelected ? 'text-white opacity-70' : 'text-cherry-dark opacity-50'}`}>
                        {client.email}
                      </p>
                    </div>
                    {hasDraft && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(184,134,11,0.15)', color: '#b8860b' }}>
                        BORRADOR
                      </span>
                    )}
                    {hasPublished && !hasDraft && (
                      <CheckCircle2 size={14} className="flex-shrink-0" style={{ color: isSelected ? 'white' : '#b8860b' }} />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: workspace */}
        <div className="flex-1 min-w-0">
          {!selectedUserId ? (
            <Card padding="md" shadow="soft" className="h-full flex items-center justify-center">
              <div className="text-center py-20">
                <Sparkles size={40} className="mx-auto text-cherry opacity-30" />
                <p className="mt-4 text-sm text-cherry-dark opacity-50">
                  Selecciona un cliente premium para gestionar su estrategia
                </p>
              </div>
            </Card>
          ) : !session ? (
            /* Sin sesión: transcripción → generar */
            <Card padding="md" shadow="soft" className="space-y-4">
              <div>
                <h3 className="font-bold text-cherry-dark text-lg">
                  {selectedClient?.full_name || selectedClient?.email}
                </h3>
                <p className="text-sm text-cherry-dark opacity-60">{selectedClient?.email}</p>
              </div>
              <div className="border-t border-soft pt-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70">
                  Transcripción de la videollamada
                </label>
                <textarea
                  value={transcription}
                  onChange={e => setTranscription(e.target.value)}
                  rows={14}
                  placeholder="Pega aquí toda la transcripción de la videollamada con el cliente. Habla de su negocio, servicios, clienta ideal, objetivos, estilo, competencia…"
                  className={fieldStyle}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                />
                <button
                  onClick={generateStrategy}
                  disabled={generating || !transcription.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm font-bold transition-all bg-cherry text-white hover:opacity-90 disabled:opacity-50"
                >
                  {generating ? (
                    <><Loader2 size={16} className="animate-spin" /> Generando estrategia con IA…</>
                  ) : (
                    <><Sparkles size={16} /> Generar estrategia</>
                  )}
                </button>
              </div>
            </Card>
          ) : isPublished ? (
            /* Publicada */
            <Card padding="md" shadow="soft" className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)]" style={{ background: 'rgba(184,134,11,0.08)' }}>
                <CheckCircle2 size={24} style={{ color: '#b8860b' }} />
                <div>
                  <p className="font-bold text-cherry-dark">Estrategia publicada</p>
                  <p className="text-xs text-cherry-dark opacity-60">
                    El cliente ya puede verla en "Mi Estrategia" · {new Date(session.published_at!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {strategy && (
                <div className="border-t border-soft pt-4">
                  <StrategyDisplay strategy={strategy} onRegenerate={startNewDraft} />
                </div>
              )}
              <button
                onClick={startNewDraft}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-all bg-buttermilk text-cherry-dark hover:opacity-80"
              >
                <RotateCcw size={14} /> Crear nuevo borrador
              </button>
            </Card>
          ) : (
            /* Borrador: transcripción colapsable + estrategia + chat + publicar */
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-cherry-dark text-lg">
                    {selectedClient?.full_name || selectedClient?.email}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(184,134,11,0.15)', color: '#b8860b' }}>
                    BORRADOR
                  </span>
                </div>
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold transition-all bg-cherry text-white hover:opacity-90 disabled:opacity-50"
                >
                  {publishing ? (
                    <><Loader2 size={14} className="animate-spin" /> Publicando…</>
                  ) : (
                    <><CheckCircle2 size={14} /> Publicar al cliente</>
                  )}
                </button>
              </div>

              {/* Transcripción colapsable */}
              <Card padding="none" shadow="soft" className="overflow-hidden">
                <button
                  onClick={() => setShowTranscription(!showTranscription)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-cherry-dark opacity-70 hover:opacity-100 transition-opacity"
                >
                  <FileText size={14} />
                  Transcripción
                  <span className="ml-auto text-xs opacity-60">{showTranscription ? 'Ocultar' : 'Ver'}</span>
                </button>
                <AnimatePresence initial={false}>
                  {showTranscription && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3">
                        <p className="text-xs text-cherry-dark opacity-70 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                          {transcription}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Estrategia preview */}
              {strategy && (
                <Card padding="md" shadow="soft">
                  <StrategyDisplay strategy={strategy} onRegenerate={() => {}} />
                </Card>
              )}

              {/* Chat de refinamiento */}
              <Card padding="none" shadow="soft" className="overflow-hidden">
                <div className="px-4 py-2.5 border-b border-soft flex items-center gap-2">
                  <Sparkles size={14} className="text-cherry" />
                  <span className="text-sm font-semibold text-cherry-dark">Refinar con IA</span>
                  <span className="text-xs text-cherry-dark opacity-40 ml-auto">Escribe instrucciones para ajustar la estrategia</span>
                </div>
                <div ref={chatScrollRef} className="px-4 py-3 space-y-2.5 max-h-64 overflow-y-auto" style={{ minHeight: 120 }}>
                  {chatMessages.length === 0 && !refining && (
                    <p className="text-xs text-center text-cherry-dark opacity-40 py-6">
                      Escribe abajo para pedir ajustes. Ej: "haz el tono más cercano y divertido", "añade más servicios", "cambia la clienta ideal a mujeres 35-50"
                    </p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(122,24,50,0.08)' }}>
                          <Sparkles size={13} className="text-cherry" />
                        </div>
                      )}
                      <div
                        className="max-w-[75%] px-3 py-2 rounded-[var(--radius-sm)] text-sm"
                        style={{
                          background: msg.role === 'admin' ? 'var(--color-cherry)' : 'var(--color-buttermilk)',
                          color: msg.role === 'admin' ? 'white' : 'var(--color-cherry-dark)',
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {refining && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(122,24,50,0.08)' }}>
                        <Loader2 size={13} className="text-cherry animate-spin" />
                      </div>
                      <div className="px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-buttermilk text-cherry-dark opacity-70">
                        Actualizando estrategia…
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-3 py-3 border-t border-soft flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                    placeholder="Escribe una instrucción para la IA…"
                    disabled={refining}
                    className={fieldStyle}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={refining || !chatInput.trim()}
                    className="p-2.5 rounded-[var(--radius-sm)] bg-cherry text-white hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  >
                    <SendHorizonal size={16} />
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}