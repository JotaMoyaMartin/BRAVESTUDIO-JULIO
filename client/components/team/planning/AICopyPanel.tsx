'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Mic, MicOff, Loader2, X, Check, RefreshCw } from 'lucide-react'
import { CLIENTS } from '@/lib/team/mock-data'

interface Props {
  clientId: string
  type: 'reel' | 'carrusel'
  topic: string
  images: string[]
  onApply: (copy: string) => void
  onClose: () => void
}

// Minimal typing for the webkit SpeechRecognition API (not in lib.dom yet).
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: any) => void) | null
  onend: (() => void) | null
  onerror: ((e: any) => void) | null
}

export default function AICopyPanel({ clientId, type, topic, images, onApply, onClose }: Props) {
  const [topicInput, setTopicInput] = useState(topic || '')
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mockNote, setMockNote] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      setVoiceSupported(true)
      const rec: SpeechRecognitionLike = new SR()
      rec.lang = 'es-ES'
      rec.continuous = false
      rec.interimResults = true
      rec.onresult = (e: any) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
        setTopicInput(text)
      }
      rec.onend = () => setListening(false)
      rec.onerror = () => { setListening(false); setError('No pude escuchar — prueba otra vez') }
      recognitionRef.current = rec
    }
    return () => { try { recognitionRef.current?.stop() } catch { /* noop */ } }
  }, [])

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      setError(null)
      setTopicInput('')
      recognitionRef.current.start()
      setListening(true)
    }
  }

  const generate = async () => {
    if (!topicInput.trim()) { setError('Escribe el tema primero'); return }
    setLoading(true)
    setError(null)
    setMockNote(null)
    try {
      const client = CLIENTS.find(c => c.id === clientId)
      const res = await fetch('/team/api/ai/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          type,
          salonName: client?.salonName,
          clientName: client?.name,
          tone: client?.tone,
          objectives: client?.objectives,
          services: client?.mainServices,
          promoteService: client?.promoteService,
          images: type === 'carrusel' ? images : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error generando copy')
      setGenerated(data.content)
      if (data.mock) setMockNote(data.note || 'IA no configurada')
    } catch (e: any) {
      setError(e.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  const apply = () => {
    onApply(generated)
    onClose()
  }

  return (
    <div className="mt-2 rounded-lg border border-[#A04060] bg-gradient-to-br from-[#FFFDF5] to-[#FFF1B5]/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#7A1832]">
          <Sparkles size={13} /> Copy con IA
        </div>
        <button onClick={onClose} className="text-[#8a8680] hover:text-[#1a1a1a]">
          <X size={14} />
        </button>
      </div>

      {/* Topic input + voice */}
      <div className="flex gap-1.5">
        <input
          value={topicInput}
          onChange={e => setTopicInput(e.target.value)}
          placeholder={listening ? 'Escuchando…' : 'Tema: p.ej. "Por qué tu rubio se vuelve naranja"'}
          className="flex-1 px-2.5 py-2 text-[12.5px] rounded-md border border-[#e8e6e3] bg-white focus:outline-none focus:border-[#7A1832]"
        />
        {voiceSupported && (
          <button
            onClick={toggleVoice}
            type="button"
            title="Hablar el tema"
            className={`px-2.5 rounded-md flex items-center justify-center transition-colors ${
              listening
                ? 'bg-[#7A1832] text-white animate-pulse'
                : 'bg-white border border-[#e8e6e3] text-[#8a8680] hover:text-[#7A1832] hover:border-[#7A1832]/40'
            }`}
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="text-[12px] font-medium bg-[#7A1832] hover:bg-[#591427] disabled:opacity-50 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5"
        >
          {loading ? <><Loader2 size={13} className="animate-spin" /> Generando…</> : <><Sparkles size={13} /> Generar copy</>}
        </button>
        {generated && !loading && (
          <button
            onClick={generate}
            className="text-[11.5px] text-[#8a8680] hover:text-[#7A1832] flex items-center gap-1"
          >
            <RefreshCw size={12} /> Regenerar
          </button>
        )}
      </div>

      {error && (
        <div className="text-[11.5px] text-[#e03131] bg-[#FFF5F5] border border-[#ffd0d0] px-2.5 py-1.5 rounded-md">{error}</div>
      )}

      {mockNote && (
        <div className="text-[10.5px] text-[#f08c00] bg-[#FFF8D1] border border-[#FFF8D1] px-2.5 py-1.5 rounded-md flex items-start gap-1.5">
          <span>⚠️</span><span>{mockNote}</span>
        </div>
      )}

      {generated && (
        <div className="space-y-2">
          <div className="bg-white border border-[#e8e6e3] rounded-md p-2.5 max-h-[200px] overflow-y-auto">
            <p className="text-[12.5px] text-[#1a1a1a] whitespace-pre-wrap leading-relaxed">{generated}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={apply}
              className="text-[12px] font-medium bg-[#2f9e44] hover:bg-[#2a8c3b] text-white px-3 py-1.5 rounded-md flex items-center gap-1.5"
            >
              <Check size={13} /> Aplicar
            </button>
            <button
              onClick={() => setGenerated('')}
              className="text-[12px] text-[#8a8680] hover:text-[#1a1a1a] px-2 py-1.5"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="text-[10px] text-[#8a8680] pt-1">
        Sigue el manual BRÄVE: gancho → contexto → solución → CTA conversacional.
      </div>
    </div>
  )
}