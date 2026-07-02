'use client'
import { useState } from 'react'
import { Copy, Check, BookOpen, MessageSquare, RefreshCw, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  question: string
  topic: string
  index: number
  copied: string | null
  onCopy: (text: string, key: string) => void
  onSave: () => void
  saved: boolean
  onRespond: () => void
  responding: boolean
  answerWritten: string | null
  answerCamera: string | null
  onSaveAnswer: (mode: 'written' | 'camera', text: string) => void
  onScheduleAnswer: (mode: 'written' | 'camera', text: string) => void
}

export default function QuestionCard({
  question, topic, index, copied, onCopy, onSave, saved, onRespond, responding,
  answerWritten, answerCamera, onSaveAnswer, onScheduleAnswer,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showSchedule, setShowSchedule] = useState<'written' | 'camera' | null>(null)
  const [date, setDate] = useState('')

  function handleRespond() {
    onRespond()
    setExpanded(true)
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)', boxShadow: '0 4px 16px rgba(90,20,39,0.06)' }}
    >
      {/* Question header — Instagram question box style */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Question icon */}
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7A1832, #591427)' }}
          >
            <MessageSquare size={18} style={{ color: 'white' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#7A1832', opacity: 0.6 }}>
              Pregunta {index + 1} · {topic}
            </p>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#1a1a1a' }}>
              {question}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onCopy(question, `q-${index}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: copied === `q-${index}` ? '#7A1832' : '#FFF1B5', color: copied === `q-${index}` ? 'white' : '#591427' }}
          >
            {copied === `q-${index}` ? <Check size={12} /> : <Copy size={12} />}
            {copied === `q-${index}` ? '¡Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={handleRespond}
            disabled={responding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: responding ? '#7A1832' : '#C1DBE8', color: responding ? 'white' : '#2a5a6a' }}
          >
            {responding ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
            {responding ? 'Generando...' : 'Responder'}
          </button>
          <button
            onClick={onSave}
            disabled={saved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: saved ? '#7A1832' : '#F5F0E8', color: saved ? 'white' : '#591427' }}
          >
            <BookOpen size={12} />
            {saved ? '✓ Guardada' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Answer section */}
      {expanded && (responding || answerWritten !== null) && (
        <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: 'rgba(255,241,181,0.5)' }}>
          {responding && (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: '#591427', opacity: 0.7 }}>Bravi está preparando tu respuesta…</p>
            </div>
          )}

          {!responding && answerWritten !== null && (
            <>
              {/* Written answer */}
              <AnswerSubCard
                mode="written"
                text={answerWritten}
                index={index}
                copied={copied}
                onCopy={onCopy}
                onSave={onSaveAnswer}
                onSchedule={(text) => { setShowSchedule('written'); }}
                showSchedule={showSchedule === 'written'}
                date={date}
                setDate={setDate}
                onConfirmSchedule={() => { if (date) onScheduleAnswer('written', answerWritten) }}
              />

              {/* Camera answer */}
              <AnswerSubCard
                mode="camera"
                text={answerCamera || ''}
                index={index}
                copied={copied}
                onCopy={onCopy}
                onSave={onSaveAnswer}
                onSchedule={(text) => { setShowSchedule('camera'); }}
                showSchedule={showSchedule === 'camera'}
                date={date}
                setDate={setDate}
                onConfirmSchedule={() => { if (date && answerCamera) onScheduleAnswer('camera', answerCamera) }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AnswerSubCard({
  mode, text, index, copied, onCopy, onSave, onSchedule, showSchedule, date, setDate, onConfirmSchedule,
}: {
  mode: 'written' | 'camera'
  text: string
  index: number
  copied: string | null
  onCopy: (text: string, key: string) => void
  onSave: (mode: 'written' | 'camera', text: string) => void
  onSchedule: (text: string) => void
  showSchedule: boolean
  date: string
  setDate: (d: string) => void
  onConfirmSchedule: () => void
}) {
  const key = `resp-${mode}-${index}`
  const bgColor = mode === 'written' ? '#FFFDF5' : '#C1DBE8'
  const borderColor = mode === 'written' ? 'rgba(255,241,181,0.8)' : 'rgba(193,219,232,0.8)'
  const label = mode === 'written' ? '✍️ RESPUESTA ESCRITA' : '🎥 HABLANDO A CÁMARA'
  const labelColor = mode === 'written' ? '#7A1832' : '#2a5a6a'

  return (
    <div className="rounded-2xl p-4" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: labelColor, opacity: 0.7 }}>
        {label}
      </p>
      <p className="text-sm leading-relaxed mb-3" style={{ color: '#1a1a1a' }}>{text}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onCopy(text, key)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: copied === key ? '#7A1832' : 'white', color: copied === key ? 'white' : '#591427' }}
        >
          {copied === key ? <Check size={11} /> : <Copy size={11} />}
          {copied === key ? '¡Copiado!' : 'Copiar'}
        </button>
        <button
          onClick={() => onSave(mode, text)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'white', color: '#591427' }}
        >
          <BookOpen size={11} /> Guardar
        </button>
        <button
          onClick={() => onSchedule(text)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'white', color: '#591427' }}
        >
          <Calendar size={11} /> Programar
        </button>
      </div>

      {showSchedule && (
        <div className="flex gap-2 mt-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: 'white' }}
          />
          <button
            onClick={onConfirmSchedule}
            disabled={!date}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: '#7A1832', opacity: date ? 1 : 0.5 }}
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  )
}