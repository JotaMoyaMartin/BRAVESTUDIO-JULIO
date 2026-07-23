'use client'
import { TEAM, CLIENTS, CONTENT, ROLE_LABELS } from '@/lib/team/mock-data'
import { Mail, Circle } from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  disponible: { label: 'Disponible', color: '#2f9e44', bg: '#EBFBEE' },
  ocupado: { label: 'Ocupado', color: '#f08c00', bg: '#FFF8D1' },
  ausente: { label: 'Ausente', color: '#8a8680', bg: '#f4f3f1' },
}

export default function Equipo() {
  const byRole = (['admin', 'cm', 'editor', 'designer'] as const).map(role => ({
    role,
    members: TEAM.filter(t => t.role === role),
  }))

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-4">
        <h2 className="font-semibold text-[14px] text-[#1a1a1a]">Equipo BRÄVE</h2>
        <p className="text-[12px] text-[#8a8680] mt-0.5">{TEAM.length} personas · Carga de trabajo en tiempo real</p>
      </div>

      {byRole.map(({ role, members }) => (
        <div key={role}>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#8a8680] mb-3 px-1">{ROLE_LABELS[role]}s</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => {
              const tContent = CONTENT.filter(c => c.editorId === m.id || c.designerId === m.id || c.cmId === m.id)
              const done = tContent.filter(c => ['finalizado','planificado','aprobado'].includes(c.status)).length
              const inProg = tContent.filter(c => ['en_proceso','en_edicion','en_diseno','en_revision'].includes(c.status)).length
              const blocked = tContent.filter(c => ['pendiente_material','cambios_solicitados'].includes(c.status)).length
              const pct = tContent.length ? Math.round((done / tContent.length) * 100) : 0
              const sCfg = STATUS_CFG[m.status]
              return (
                <div key={m.id} className="bg-white rounded-xl border border-[#FFF1B5] p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0" style={{ background: m.color }}>
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] text-[#1a1a1a]">{m.name}</div>
                      <div className="text-[11.5px] text-[#8a8680]">{ROLE_LABELS[m.role]}</div>
                    </div>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1" style={{ color: sCfg.color, background: sCfg.bg }}>
                      <Circle size={7} fill={sCfg.color} /> {sCfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Stat label="Total" value={tContent.length} />
                    <Stat label="En curso" value={inProg} />
                    <Stat label="Bloq." value={blocked} />
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#8a8680]">Progreso</span>
                      <span className="text-[#3d3d3d] font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#f4f3f1] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>

                  <div className="text-[11.5px] text-[#8a8680]">
                    <span className="font-medium text-[#3d3d3d]">{m.clients.length}</span> clientes asignados
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#FFFDF5] rounded-lg p-2 text-center">
      <div className="text-[16px] font-bold text-[#1a1a1a] leading-none">{value}</div>
      <div className="text-[10px] text-[#8a8680] mt-1">{label}</div>
    </div>
  )
}