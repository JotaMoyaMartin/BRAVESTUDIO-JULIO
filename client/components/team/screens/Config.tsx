'use client'
import { Settings, Database, Palette, Bell, Users } from 'lucide-react'

export default function Config() {
  return (
    <div className="space-y-4 max-w-[900px]">
      <div className="bg-white rounded-xl border border-[#FFF1B5] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} className="text-[#7A1832]" />
          <h2 className="font-semibold text-[14px] text-[#1a1a1a]">Configuración del estudio</h2>
        </div>
        <p className="text-[12px] text-[#8a8680]">Prototipo local — las opciones se guardan en el navegador.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Users, title: 'Equipo', desc: 'Gestionar miembros y roles' },
          { icon: Palette, title: 'Apariencia', desc: 'Personalizar el tema visual' },
          { icon: Bell, title: 'Notificaciones', desc: 'Preferencias de alertas' },
          { icon: Database, title: 'Datos', desc: 'Importar o exportar datos' },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.title} className="bg-white rounded-xl border border-[#FFF1B5] p-5 flex items-start gap-3 hover:shadow-sm transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-[#FFF1B5] flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#7A1832]" />
              </div>
              <div>
                <div className="font-semibold text-[13.5px] text-[#1a1a1a]">{item.title}</div>
                <div className="text-[12px] text-[#8a8680] mt-0.5">{item.desc}</div>
                <div className="text-[11px] text-[#d0cecb] mt-2">Próximamente</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-br from-[#FFF1B5] to-[#A04060] rounded-xl border border-[#C1DBE8] p-5">
        <h3 className="font-semibold text-[14px] text-[#1a1a1a] mb-1">BRÄVE Content Studio</h3>
        <p className="text-[12px] text-[#3d3d3d]">Prototipo v1.0 · Datos mock · Jul 2026</p>
      </div>
    </div>
  )
}