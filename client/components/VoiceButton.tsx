'use client'
import { useState, useEffect } from 'react'
import { Mic } from 'lucide-react'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  label?: string
  listeningLabel?: string
  className?: string
}

/**
 * Browser speech-to-text button. Uses the Web Speech API (webkitSpeechRecognition).
 * If unsupported, renders a small notice telling the user to type instead.
 * Extracted from MiMarcaClient so onboarding can reuse it.
 */
export default function VoiceButton({
  onTranscript,
  label = 'Grabar voz',
  listeningLabel = 'Escuchando...',
  className = '',
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  function start() {
    const w = window as unknown as Record<string, unknown>
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) { setSupported(false); return }
    const recognition = new (SpeechRecognition as new () => {
      lang: string; continuous: boolean; interimResults: boolean
      onresult: (e: { results: { transcript: string }[][] }) => void
      onerror: () => void; onend: () => void; start: () => void
    })()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e) => onTranscript(e.results[0][0].transcript)
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognition.start()
    setListening(true)
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
      onClick={start}
      disabled={listening}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${className}`}
      style={{ background: listening ? '#FFF1B5' : '#F5F0E8', color: '#591427' }}
    >
      <Mic size={16} className={listening ? 'animate-pulse' : ''} />
      {listening ? listeningLabel : `🎙️ ${label}`}
    </button>
  )
}