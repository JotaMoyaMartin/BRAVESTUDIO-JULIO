'use client'
/**
 * Nota de voz → texto (tipo WhatsApp): graba con MediaRecorder y transcribe
 * en el servidor (/api/ai/transcribe-voice, Whisper). Funciona en iPhone
 * (Safari graba audio/mp4) y en Chrome/Android (audio/webm).
 *
 * Si el servidor no tiene clave de transcripción (501), el componente puede
 * caer al dictado del navegador (lib/speech.ts).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceNoteState = 'idle' | 'recording' | 'transcribing'

export type VoiceNoteError = 'no_permission' | 'unsupported' | 'no_key' | 'no_speech' | 'failed'

const MAX_SECONDS = 180

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
  return candidates.find(t => {
    try { return MediaRecorder.isTypeSupported(t) } catch { return false }
  })
}

export function useVoiceNote(onText: (text: string) => void, onError?: (e: VoiceNoteError) => void) {
  const [state, setState] = useState<VoiceNoteState>('idle')
  const [seconds, setSeconds] = useState(0)
  /** Nivel de voz 0-1 para animar el botón mientras se graba. */
  const [level, setLevel] = useState(0)
  const [supported, setSupported] = useState(false)

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const cancelledRef = useRef(false)
  const onTextRef = useRef(onText)
  const onErrorRef = useRef(onError)
  onTextRef.current = onText
  onErrorRef.current = onError

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
    return () => cleanup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    setLevel(0)
  }

  async function transcribe(blob: Blob) {
    setState('transcribing')
    try {
      const res = await fetch('/api/ai/transcribe-voice', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        body: blob,
      })
      if (res.status === 501) { onErrorRef.current?.('no_key'); return }
      if (res.status === 422) { onErrorRef.current?.('no_speech'); return }
      if (!res.ok) { onErrorRef.current?.('failed'); return }
      const { text } = await res.json()
      if (typeof text === 'string' && text.trim()) onTextRef.current(text.trim())
      else onErrorRef.current?.('no_speech')
    } catch {
      onErrorRef.current?.('failed')
    } finally {
      setState('idle')
    }
  }

  const stop = useCallback(() => {
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stop()
  }, [stop])

  const start = useCallback(async () => {
    if (state !== 'idle') return
    if (!supported) { onErrorRef.current?.('unsupported'); return }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      onErrorRef.current?.('no_permission')
      return
    }
    streamRef.current = stream
    chunksRef.current = []
    cancelledRef.current = false
    const mime = pickMime()
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recRef.current = rec
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' })
      cleanup()
      recRef.current = null
      if (cancelledRef.current || blob.size < 1200) { setState('idle'); return }
      transcribe(blob)
    }

    // Medidor de nivel (animación del botón).
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        setLevel(Math.min(1, sum / data.length / 70))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* sin medidor: no pasa nada */ }

    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= MAX_SECONDS) stop()
        return s + 1
      })
    }, 1000)
    rec.start(250)
    setState('recording')
  }, [state, supported, stop])

  return { state, seconds, level, supported, start, stop, cancel, maxSeconds: MAX_SECONDS }
}

export function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
