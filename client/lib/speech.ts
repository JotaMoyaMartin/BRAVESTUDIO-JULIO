'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Dictado por voz con la Web Speech API (nativa del navegador: sin librerías,
// sin claves, sin coste). La usan los campos de "escribe tu idea" para que la
// estilista hable y el texto entre directo.
//
// Compatibilidad: Chromium/Android ✓ y Safari/iOS ≥14.5. Si el navegador no la
// tiene, `supported` = false y la UI oculta el botón (nunca rompe el flujo).
// Solo funciona con contexto seguro (HTTPS/localhost) y gesto de usuario.

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: unknown) => void) | null
  onend: (() => void) | null
  onerror: ((e: unknown) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/**
 * Devuelve trozos FINALES de dictado vía onFinalText (se acumulan en el setter
 * del campo). `listening` marca el estado para la UI; al parar se corta solo.
 */
export function useDictateText(lang = 'es-ES'): {
  supported: boolean
  listening: boolean
  start: (onFinalText: (text: string) => void) => boolean
  stop: () => void
} {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
    return () => {
      try {
        recRef.current?.abort()
      } catch {
        /* noop */
      }
    }
  }, [])

  const stop = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    setListening(false)
  }, [])

  const start = useCallback(
    (onFinalText: (text: string) => void): boolean => {
      onFinalRef.current = onFinalText
      const Ctor = getRecognitionCtor()
      if (!Ctor) return false
      if (recRef.current) stop()
      let rec: SpeechRecognitionLike
      try {
        rec = new Ctor()
      } catch {
        return false
      }
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = false
      rec.onresult = (e: unknown) => {
        const ev = e as { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }
        let final = ''
        for (let i = 0; i < ev.results.length; i++) {
          const r = ev.results[i]
          if (r.isFinal && r[0]?.transcript) final += `${final ? ' ' : ''}${r[0].transcript.trim()}`
        }
        if (final.trim()) onFinalRef.current?.(final.trim())
      }
      rec.onend = () => setListening(false)
      rec.onerror = () => setListening(false) // sin permiso / red: se apaga y ya
      try {
        rec.start()
        recRef.current = rec
        setListening(true)
        return true
      } catch {
        return false // ya estaba corriendo (start doble): sin castigo
      }
    },
    [lang, stop],
  )

  return { supported, listening, start, stop }
}