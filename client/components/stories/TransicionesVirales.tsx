'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, ChevronDown, Sparkles, Film } from 'lucide-react'
import {
  TRANSICIONES,
  GRUPOS_TRANSICION,
  type TransicionPreset,
  type TransicionGrupo,
} from '@/lib/transitions-data'

interface Props {
  /** Texto ya copiable generado para cada transición (opcional). */
  onCopy?: (texto: string, key: string) => void
  /** Key de copiado activa para mostrar "¡Copiado!" en el botón correcto. */
  copiedKey?: string | null
  /** Número de stories de la secuencia (para mostrar sugerencias entre planos). */
  storiesCount?: number
  /** Modo de la story: cámara recomienda transiciones de movimiento, texto revelados. */
  mode?: 'text' | 'camera'
}

/**
 * Sección colapsable "Transiciones Virales" que se integra dentro del
 * creador de Stories. Muestra una galería de presets agrupados por tipo,
 * sugiere transiciones entre planos de la secuencia, y deja copiar la
 * descripción de cada una. Bravi explica por qué importan.
 */
export default function TransicionesVirales({
  onCopy,
  copiedKey,
  storiesCount = 3,
  mode = 'camera',
}: Props) {
  const [open, setOpen] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState<TransicionGrupo | 'all'>('all')

  // Filtra por grupo activo
  const visibles = useMemo(() => {
    if (grupoActivo === 'all') return TRANSICIONES
    return TRANSICIONES.filter((t) => t.grupo === grupoActivo)
  }, [grupoActivo])

  // Sugerencias automáticas entre planos (1 → 2 → 3 ...)
  const sugerencias = useMemo(() => {
    const count = Math.max(1, storiesCount)
    const tipos: TransicionGrupo[] =
      mode === 'camera'
        ? ['movimiento', 'corte', 'revelar', 'energia']
        : ['revelar', 'corte', 'movimiento', 'energia']
    const out: { entre: string; preset: TransicionPreset }[] = []
    for (let i = 0; i < count - 1; i++) {
      const tipo = tipos[i % tipos.length]
      const preset = TRANSICIONES.find((t) => t.grupo === tipo) || TRANSICIONES[i % TRANSICIONES.length]
      out.push({ entre: `Story ${i + 1} → Story ${i + 2}`, preset })
    }
    return out
  }, [storiesCount, mode])

  function handleCopy(preset: TransicionPreset) {
    const texto = `${preset.nombre} (${preset.icono})\nCómo se hace: ${preset.descripcion}\nCuándo usarlo: ${preset.cuando}`
    if (onCopy) {
      onCopy(texto, `trans-${preset.id}`)
    }
  }

  const isCopied = (id: string) => copiedKey === `trans-${id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}
    >
      {/* ── Header colapsable ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors"
        style={{ background: open ? '#FFF8E7' : 'white' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-buttermilk)' }}
          >
            <Film size={18} style={{ color: 'var(--color-cherry)' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
              Transiciones virales
            </p>
            <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
              {sugerencias.length} sugerencia{sugerencias.length === 1 ? '' : 's'} · {TRANSICIONES.length} presets
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={18} style={{ color: 'var(--color-cherry)' }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* ── Bloque Bravi dice ── */}
              <div
                className="p-3 rounded-xl flex items-start gap-3"
                style={{ background: 'var(--color-buttermilk)', border: '1.5px solid rgba(122,24,50,0.12)' }}
              >
                <img
                  src="/bravi2.png"
                  alt="Bravi"
                  className="flex-shrink-0 bravi-float"
                  style={{
                    width: 28,
                    height: 28,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 3px rgba(89,20,39,0.15))',
                  }}
                  draggable={false}
                />
                <p className="text-sm" style={{ color: '#591427' }}>
                  <strong>Bravi dice:</strong> Las transiciones son lo que retiene a la
                  espectadora entre planos. Una buena transición puede ser la diferencia
                  entre que tu Story se vea completa o se salten al siguiente contenido.
                </p>
              </div>

              {/* ── Sugerencias entre planos ── */}
              {sugerencias.length > 0 && (
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--color-cherry)', opacity: 0.7 }}
                  >
                    Sugerencias entre planos
                  </p>
                  <div className="space-y-2">
                    {sugerencias.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.25 }}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                          background: 'var(--color-cream)',
                          border: '1px solid rgba(255,241,181,0.6)',
                        }}
                      >
                        <span
                          className="text-base flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'white' }}
                        >
                          {s.preset.icono}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: '#591427' }}>
                            {s.entre}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#1a1a1a', opacity: 0.75 }}>
                            {s.preset.nombre} · {s.preset.descripcion.slice(0, 60)}…
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(s.preset)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                          style={{
                            background: isCopied(s.preset.id) ? 'var(--color-cherry)' : 'var(--color-buttermilk)',
                            color: isCopied(s.preset.id) ? 'white' : 'var(--color-cherry-dark)',
                          }}
                        >
                          {isCopied(s.preset.id) ? <Check size={12} /> : <Copy size={12} />}
                          {isCopied(s.preset.id) ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Filtros por grupo ── */}
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-cherry)', opacity: 0.7 }}
                >
                  Librería completa
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setGrupoActivo('all')}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: grupoActivo === 'all' ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                      color: grupoActivo === 'all' ? 'white' : 'var(--color-cherry-dark)',
                    }}
                  >
                    <Sparkles size={12} className="inline -mt-0.5 mr-1" />
                    Todas
                  </button>
                  {GRUPOS_TRANSICION.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGrupoActivo(g.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: grupoActivo === g.id ? 'var(--color-cherry)' : 'var(--color-warm-gray)',
                        color: grupoActivo === g.id ? 'white' : 'var(--color-cherry-dark)',
                      }}
                    >
                      {g.emoji} {g.titulo}
                    </button>
                  ))}
                </div>

                {/* ── Grid de presets ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout">
                    {visibles.map((t, i) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: 0.02 * i }}
                        className="p-3 rounded-xl"
                        style={{
                          background: 'var(--color-cream)',
                          border: '1px solid rgba(255,241,181,0.6)',
                        }}
                      >
                        <div className="flex items-start gap-2.5 mb-2">
                          <span
                            className="text-xl flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: 'white' }}
                          >
                            {t.icono}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
                              {t.nombre}
                            </p>
                            <p className="text-[11px] font-medium" style={{ color: 'var(--color-cherry)', opacity: 0.7 }}>
                              {GRUPOS_TRANSICION.find((g) => g.id === t.grupo)?.emoji}{' '}
                              {GRUPOS_TRANSICION.find((g) => g.id === t.grupo)?.titulo}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed mb-1.5" style={{ color: '#591427' }}>
                          <strong>Cómo:</strong> {t.descripcion}
                        </p>
                        <p className="text-xs leading-relaxed mb-2.5" style={{ color: '#591427', opacity: 0.85 }}>
                          <strong>Cuándo:</strong> {t.cuando}
                        </p>
                        <button
                          onClick={() => handleCopy(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all w-full justify-center"
                          style={{
                            background: isCopied(t.id) ? 'var(--color-cherry)' : 'var(--color-buttermilk)',
                            color: isCopied(t.id) ? 'white' : 'var(--color-cherry-dark)',
                          }}
                        >
                          {isCopied(t.id) ? <Check size={12} /> : <Copy size={12} />}
                          {isCopied(t.id) ? '¡Copiado!' : 'Copiar transición'}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}