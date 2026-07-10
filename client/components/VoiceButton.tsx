'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic, Square } from 'lucide-react'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  label?: string
  listeningLabel?: string
  className?: string
}

/**
 * Browser speech-to-text button. Uses the Web Speech API (webkitSpeechRecognition).
 * continuous = true: no se para con pausas breves. Solo para cuando la usuaria pulsa el botón.
 * Si no soportado, muestra aviso para escribir manualmente.
 */
export default function VoiceButton({
  onTranscript,
  label = 'Grabar voz',
  listeningLabel = 'Escuchando... pulsa para parar',
  className = '',
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const transcriptRef = useRef<string>('')

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => {
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
    }
  }, [])

  function start() {
    const w = window as unknown as Record<string, unknown>
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) { setSupported(false); return }
    const recognition = new (SpeechRecognition as new () => {
      lang: string; continuous: boolean; interimResults: boolean
      onresult: (e: { resultIndex: number; results: { transcript: string }[][] }) => void
      onerror: () => void; onend: () => void; start: () => void; stop: () => void
    })()
    recognition.lang = 'es-ES'
    recognition.continuous = true
    recognition.interimResults = true
    transcriptRef.current = ''

    recognition.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript
      }
      transcriptRef.current = full
    }

    recognition.onerror = () => {
      // Si hay error, entregamos lo que tengamos y paramos
      if (transcriptRef.current.trim()) {
        onTranscript(transcriptRef.current.trim())
      }
      setListening(false)
    }

    recognition.onend = () => {
      // Al terminar (manual o por timeout del navegador), entregamos el texto acumulado
      if (transcriptRef.current.trim()) {
        onTranscript(transcriptRef.current.trim())
      }
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }

  if (!supported) {
    return (
      <p className={`text-xs ${className}`} style={{ color: '#7A1832', opacity: 0.7 }}>
        Tu navegador no permite grabar audio. Puedes escribir la información manualmente.
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${className}`}
      style={{
        background: listening ? '#7A1832' : '#F5F0E8',
        color: listening ? 'white' : '#591427',
      }}
    >
      {listening ? <Square size={14} fill="currentColor" /> : <Mic size={16} className={listening ? 'animate-pulse' : ''} />}
      {listening ? listeningLabel : `🎙️ ${label}`}
    </button>
  )
}