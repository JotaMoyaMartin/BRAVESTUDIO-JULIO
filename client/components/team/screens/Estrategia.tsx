'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/team/auth-context'
import { CLIENTS, TEAM } from '@/lib/team/mock-data'
import type { Client } from '@/lib/team/types'
import {
  Search, Sparkles, AlertCircle, ArrowLeft,
} from 'lucide-react'
import EstrategiaDetail from './estrategia/EstrategiaDetail'

export default function Estrategia() {
  const { user, member } = useAuth()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  if (!user || !member) return null

  // Solo admin y CM ven este screen
  if (user.role !== 'admin' && user.role !== 'cm') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl border border-[#FFF1B5] text-center">
        <AlertCircle className="mx-auto mb-2 text-[#8a8680]" />
        <p className="text-[13px] text-[#8a8680]">No tienes acceso a Estrategia.</p>
      </div>
    )
  }

  // Clientes premium mapeados (con supabase_user_id)
  const scoped = useMemo(() => CLIENTS.filter(c => {
    if (!c.supabase_user_id) return false
    if (user.role === 'admin') return true
    if (user.role === 'cm') return c.cmId === member.id
    return false
  }), [user, member])

  const filtered = scoped.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.salonName.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
  })

  if (selected) {
    return (
      <div className="space-y-4 max-w-[1200px]">
        {/* Header clienta */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-[#FFF1B5] text-[#7A1832]">
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: selected.logoColor }}>
            {selected.name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-[#1a1a1a]">{selected.name} — Plan de Contenidos</h1>
            <div className="text-[12px] text-[#8a8680]">{selected.salonName} · {selected.city}</div>
          </div>
        </div>

        <EstrategiaDetail client={selected} />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8680]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar clienta premium…"
            className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-[#e8e6e3] bg-[#FFFDF5] focus:outline-none focus:border-[#7A1832] focus:bg-white"
          />
        </div>
        <div className="ml-auto text-[12px] text-[#8a8680]">{filtered.length} clientas premium</div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#FFF1B5] p-8 text-center">
          <AlertCircle className="mx-auto mb-2 text-[#8a8680]" />
          <p className="text-[13px] text-[#8a8680]">
            No hay clientas premium mapeadas. Añade <code className="text-[#7A1832]">supabase_user_id</code> en <code>lib/team/mock-data.ts</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const cm = TEAM.find(t => t.id === c.cmId)
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-white rounded-xl border border-[#FFF1B5] p-4 text-left hover:shadow-md hover:border-[#7A1832]/30 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[15px] font-bold shrink-0" style={{ background: c.logoColor }}>
                    {c.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] text-[#1a1a1a] truncate">{c.name}</div>
                    <div className="text-[11.5px] text-[#8a8680] truncate">{c.salonName}</div>
                    {cm && <div className="text-[11px] text-[#8a8680] mt-0.5">CM: {cm.name}</div>}
                  </div>
                </div>
                <div className="text-[12px] text-[#7A1832] flex items-center gap-1">
                  <Sparkles size={12} /> Ver plan de contenidos
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}