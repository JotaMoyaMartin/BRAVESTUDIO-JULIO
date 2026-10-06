import {
  Home, Sparkles, CalendarDays, ScrollText, Zap, LayoutGrid,
  Library, Calendar, Mic, Play, Check, Phone,
} from 'lucide-react'

/**
 * Mockups CSS-only con la MISMA UI real de la app (cream/cherry/buttermilk, Poppins).
 * Decorativo (aria-hidden) — el texto visible de la landing es HTML real fuera
 * de los mockups. Sin fotos de stock: solo interfaz de producto.
 */

const MENU = [
  { icon: Home, label: 'Inicio', active: true },
  { icon: Sparkles, label: 'Mi Marca' },
  { icon: CalendarDays, label: 'Planificar' },
  { icon: ScrollText, label: 'Guiones' },
  { icon: Zap, label: 'Stories' },
  { icon: LayoutGrid, label: 'Carruseles' },
  { icon: Library, label: 'Biblioteca' },
  { icon: Calendar, label: 'Calendario' },
  { icon: Mic, label: 'Teleprompter' },
]

const MINI_TILES = [
  { icon: Sparkles, label: 'Mi Marca', bg: '#FFF1B5', fg: '#591427' },
  { icon: CalendarDays, label: 'Planificar', bg: '#C1DBE8', fg: '#2a5a6a' },
  { icon: ScrollText, label: 'Guiones', bg: '#F6E3E0', fg: '#7A1832' },
  { icon: Zap, label: 'Stories', bg: '#FFF1B5', fg: '#591427' },
  { icon: LayoutGrid, label: 'Carruseles', bg: '#C1DBE8', fg: '#2a5a6a' },
  { icon: Mic, label: 'Teleprompter', bg: '#F6E3E0', fg: '#7A1832' },
]

/** Ventana desktop: Inicio con "Tu plan para hoy" (Home real de la app). */
function DesktopWindow() {
  return (
    <div className="v2-device p-2.5" aria-hidden="true">
      {/* Barra del navegador */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl" style={{ background: '#F3EAD9', borderBottom: '1px solid rgba(74,15,30,0.08)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: '#e85a5a' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#f0c14a' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#6ec06e' }} />
        <div className="flex-1 mx-2 px-2 py-0.5 rounded-md text-[8px]" style={{ background: 'white', color: '#591427', opacity: 0.55 }}>
          bravestudio.app/inicio
        </div>
      </div>

      {/* App */}
      <div className="flex rounded-b-xl overflow-hidden" style={{ background: '#FFFDF5' }}>
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col shrink-0 p-2.5" style={{ background: 'white', borderRight: '1px solid rgba(74,15,30,0.07)', width: 132 }}>
          <div className="flex items-center gap-1.5 px-1.5 pb-2.5 mb-1.5" style={{ borderBottom: '1px solid rgba(255,241,181,0.7)' }}>
            <span className="w-4 h-4 rounded-md flex items-center justify-center text-white" style={{ background: '#7A1832', fontSize: 8 }}>✦</span>
            <span className="font-extrabold text-[9px] tracking-tight" style={{ color: '#591427' }}>BRÄVE</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {MENU.map((m) => (
              <span
                key={m.label}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[8px] font-semibold"
                style={{
                  background: m.active ? '#7A1832' : 'transparent',
                  color: m.active ? 'white' : '#591427',
                  opacity: m.active ? 1 : 0.72,
                }}
              >
                <m.icon size={9} strokeWidth={2.5} />
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Contenido: plan para hoy */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[10px]" style={{ color: '#1a1a1a' }}>Hola, Carmen</span>
            <span className="text-[7px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#FFF1B5', color: '#591427' }}>Octubre</span>
          </div>

          {/* TodayCard */}
          <div className="rounded-xl p-2.5 mb-2" style={{ background: '#FFF1B5', border: '2px solid #7A1832' }}>
            <span className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: '#591427' }}>Recomendado para hoy</span>
            <p className="text-[9px] font-bold leading-snug mt-1 max-w-[150px]" style={{ color: '#1a1a1a' }}>
              Crea un Reel sobre un cambio de color de temporada
            </p>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[7px] font-bold text-white" style={{ background: '#7A1832' }}>
              Crear guiones →
            </div>
          </div>

          <p className="text-[7px] font-bold mb-1.5" style={{ color: '#591427' }}>Tus herramientas</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MINI_TILES.map((t) => (
              <div key={t.label} className="flex flex-col items-center gap-1 rounded-lg py-2 px-1" style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}>
                <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: t.bg }}>
                  <t.icon size={10} style={{ color: t.fg }} strokeWidth={2.4} />
                </span>
                <span className="text-[6.5px] font-semibold text-center leading-tight" style={{ color: '#1a1a1a' }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Teléfono con el Teleprompter (guion delante, REC, controles). */
export function TeleprompterPhone({ compact = false }: { compact?: boolean }) {
  const lines = [
    { text: 'Si tu color pierde vida en 3 semanas,', state: 'done' as const },
    { text: 'el problema no es el color…', state: 'done' as const },
    { text: 'es la rutina que lo sostiene.', state: 'current' as const },
    { text: 'Hoy te enseño cómo alargarlo', state: 'next' as const },
    { text: 'con un gesto de 10 segundos.', state: 'next' as const },
  ]
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto v2-float"
      style={{
        width: compact ? 150 : 220,
        borderRadius: compact ? 24 : 34,
        padding: compact ? 6 : 9,
        background: 'linear-gradient(145deg, #fdfaf2, #ece1d2)',
        border: '2px solid rgba(74,15,30,0.2)',
        boxShadow: compact ? '0 18px 44px rgba(20,4,8,0.45)' : '0 24px 60px rgba(20,4,8,0.5)',
      }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: compact ? 6 : 9, width: compact ? 46 : 64, height: compact ? 12 : 16, background: '#2e0812', borderRadius: '0 0 9px 9px' }}
      />
      {/* Pantalla */}
      <div
        className="overflow-hidden relative"
        style={{
          borderRadius: compact ? 19 : 26,
          background: '#1d040b',
          aspectRatio: '9 / 18.5',
        }}
      >
        {/* REC */}
        <div className="flex items-center justify-between px-3" style={{ paddingTop: compact ? 14 : 20 }}>
          <span className="flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(192,57,78,0.9)', color: 'white' }}>
            <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'white' }} />
            REC
          </span>
          <span className="text-[7px] font-semibold" style={{ color: 'rgba(255,246,236,0.7)' }}>00:24</span>
        </div>

        {/* Guion */}
        <div className="px-3 flex flex-col justify-center" style={{ marginTop: compact ? 22 : 36, gap: compact ? 8 : 12 }}>
          {lines.map((l) => (
            <p
              key={l.text}
              className={compact ? 'text-[8px] leading-snug' : 'text-[12px] leading-snug'}
              style={{
                color: l.state === 'current' ? '#FFF1B5' : l.state === 'done' ? 'rgba(255,246,236,0.35)' : 'rgba(255,246,236,0.75)',
                fontWeight: l.state === 'current' ? 700 : 500,
              }}
            >
              {l.text}
            </p>
          ))}
        </div>

        {/* Controles */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2.5 pb-3">
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              width: compact ? 22 : 34,
              height: compact ? 22 : 34,
              background: 'rgba(255,246,236,0.12)',
              border: '1px solid rgba(255,246,236,0.2)',
            }}
          >
            <Play size={compact ? 9 : 13} style={{ color: '#FFF1B5', marginLeft: 1 }} fill="#FFF1B5" />
          </span>
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{ width: compact ? 30 : 46, height: compact ? 30 : 46, background: '#c0394e', boxShadow: '0 6px 20px rgba(192,57,78,0.5)' }}
          >
            <span className="rounded-full" style={{ width: compact ? 10 : 16, height: compact ? 10 : 16, background: 'white' }} />
          </span>
        </div>
      </div>
    </div>
  )
}

/** Showcase del hero: desktop + teléfono superpuesto + chips flotantes. */
export default function HeroShowcase() {
  return (
    <div className="relative w-full" aria-hidden="true">
      {/* Halo decorativo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-10 -left-8 w-56 h-56 rounded-full blur-3xl opacity-50" style={{ background: 'rgba(160,64,96,0.55)' }} />
        <div className="absolute bottom-[-40px] right-0 w-64 h-64 rounded-full blur-3xl opacity-40" style={{ background: 'rgba(255,241,181,0.16)' }} />
      </div>

      <div className="relative">
        <DesktopWindow />

        {/* Chip flotante superior */}
        <div className="v2-float-chip v2-float-slow hidden sm:flex" style={{ top: 26, left: -12 }}>
          <Check size={13} strokeWidth={3} style={{ color: '#2a8a4a' }} />
          Plan de hoy · listo
        </div>

        {/* Teléfono superpuesto */}
        <div className="hidden md:block absolute" style={{ right: -34, bottom: -44 }}>
          <TeleprompterPhone compact />
        </div>

        {/* Chip flotante inferior */}
        <div className="v2-float-chip v2-float hidden lg:flex" style={{ bottom: -18, left: '12%' }}>
          <Phone size={13} style={{ color: '#7A1832' }} />
          Guion delante · sin memorizar
        </div>
      </div>
    </div>
  )
}