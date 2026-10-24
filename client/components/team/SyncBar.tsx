'use client'
/** Estado de la sincronización del panel del equipo (Fase 1). */
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CloudUpload, Loader2, RefreshCw } from 'lucide-react'
import { acknowledgeRemote, getSyncState, subscribeSync, uploadLocalOnly } from '@/lib/team/sync/engine'

export default function SyncBar({ onRefresh }: { onRefresh: () => void }) {
  const [s, setS] = useState(getSyncState())
  const [busy, setBusy] = useState(false)
  useEffect(() => subscribeSync(setS), [])
  if (s.status === 'off') return null

  return (
    <div className="space-y-2 mb-4">
      {s.status === 'sin-tablas' && (
        <p className="flex gap-2 rounded-xl bg-[#FFF1B5] px-4 py-3 text-[13px] text-[#591427]"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          Falta activar la base de datos del equipo (SQL-EQUIPO-FASE1.sql). Mientras, lo que hagas se guarda solo en este navegador.</p>
      )}
      {s.pendingLocal.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FBE7EB] px-4 py-3 text-[13px] text-[#591427]">
          <span><strong>{s.pendingLocal.length}</strong> {s.pendingLocal.length === 1 ? 'cosa guardada' : 'cosas guardadas'} solo en este navegador (planificaciones, tareas…). Súbelas para que el equipo las vea.</span>
          <button disabled={busy} onClick={async () => { setBusy(true); try { await uploadLocalOnly(); onRefresh() } finally { setBusy(false) } }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A1832] px-3 py-1.5 font-semibold text-white">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />} Subirlas
          </button>
        </div>
      )}
      {s.remoteChanged && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#EAF3EC] px-4 py-3 text-[13px] text-[#1F5C38]">
          <span>Tu equipo ha hecho cambios.</span>
          <button onClick={() => { acknowledgeRemote(); onRefresh() }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A7A4A] px-3 py-1.5 font-semibold text-white"><RefreshCw size={14} /> Ver cambios</button>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[12px] text-[#8a8680]" aria-live="polite">
        {s.status === 'guardando' || s.status === 'cargando' ? <><Loader2 size={13} className="animate-spin" /> {s.status === 'cargando' ? 'Cargando datos del equipo…' : 'Guardando…'}</>
          : s.status === 'error' ? <><AlertTriangle size={13} className="text-[#B8324F]" /> Sin conexión: se reintentará solo. No cierres la pestaña.</>
          : s.status === 'al-dia' ? <><CheckCircle2 size={13} className="text-[#2A7A4A]" /> Todo guardado para el equipo</> : null}
      </p>
    </div>
  )
}
