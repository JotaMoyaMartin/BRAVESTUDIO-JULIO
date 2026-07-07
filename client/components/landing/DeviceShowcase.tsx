'use client'

/**
 * Extended CSS-only device mockups for the landing page.
 * Each shows a different part of the BRÄVE app on a different device.
 * Pure presentational — gradients simulate balayage hair, no real images.
 */

// ── Balayage gradient presets ──────────────────────────────────────
const BALAYAGE_GRADIENTS = {
  honey: 'linear-gradient(160deg, #c89060 0%, #d9a878 30%, #e8c098 55%, #f0d4a8 75%, #a86a40 100%)',
  copper: 'linear-gradient(155deg, #b8835a 0%, #d9a878 35%, #e8c098 60%, #f0d4a8 80%, #8a5a3a 100%)',
  platinum: 'linear-gradient(160deg, #d4c4a8 0%, #e8dcc8 30%, #f0e4d0 55%, #d8c8b0 80%, #b8a890 100%)',
  process: 'linear-gradient(170deg, #8a6a4a 0%, #b8835a 30%, #d9a878 60%, #c89060 100%)',
  result: 'linear-gradient(165deg, #c89060 0%, #e8c098 25%, #f0d4a8 50%, #d9a878 75%, #b8835a 100%)',
}

// ── MacBook mockup showing Biblioteca ──────────────────────────────
export function MacBookBiblioteca() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 520 }}>
      {/* Screen */}
      <div
        className="rounded-t-2xl p-3"
        style={{
          background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
          border: '2px solid rgba(89,20,39,0.12)',
          borderBottom: 'none',
        }}
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#FFFDF5', aspectRatio: '16 / 10', border: '1px solid rgba(122,24,50,0.1)' }}
        >
          {/* Browser bar */}
          <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#F5F0E8', borderBottom: '1px solid rgba(122,24,50,0.08)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#e85a5a' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#f0c14a' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#6ec06e' }} />
            <div className="flex-1 mx-2 px-2 py-0.5 rounded-md text-[8px]" style={{ background: 'white', color: '#591427', opacity: 0.5 }}>
              bravestudio.app/biblioteca
            </div>
          </div>
          {/* Biblioteca grid */}
          <div className="p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white" style={{ background: '#7A1832' }}>✦</div>
              <span className="text-[9px] font-bold" style={{ color: '#591427' }}>Biblioteca</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[7px] font-bold text-white" style={{ background: '#7A1832' }}>24 ideas</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { t: 'Balayage', c: '#7A1832', g: BALAYAGE_GRADIENTS.honey },
                { t: 'Rubios', c: '#2a5a6a', g: BALAYAGE_GRADIENTS.platinum },
                { t: 'Keratina', c: '#7a6000', g: BALAYAGE_GRADIENTS.copper },
                { t: 'Alisados', c: '#7A1832', g: BALAYAGE_GRADIENTS.result },
                { t: 'Cortes', c: '#2a5a6a', g: BALAYAGE_GRADIENTS.process },
                { t: 'Color', c: '#7a6000', g: BALAYAGE_GRADIENTS.honey },
              ].map((row, i) => (
                <div key={i} className="rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,241,181,0.8)' }}>
                  <div style={{ height: 28, background: row.g }} />
                  <div className="p-1" style={{ background: 'white' }}>
                    <span className="text-[6px] font-bold" style={{ color: row.c }}>{row.t}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Base */}
      <div className="mx-auto" style={{ width: '100%', height: 10, background: 'linear-gradient(180deg, #d8d0c4, #b8aea0)', borderRadius: '0 0 16px 16px' }} />
      <div className="mx-auto" style={{ width: 80, height: 4, background: '#a89e90', borderRadius: '0 0 8px 8px' }} />
    </div>
  )
}

// ── iPad mockup showing Mi Marca strategy ──────────────────────────
export function IPadMiMarca() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 300,
        borderRadius: 24,
        padding: 10,
        background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
        border: '2px solid rgba(89,20,39,0.15)',
        boxShadow: 'var(--shadow-strong)',
      }}
    >
      {/* Camera dot */}
      <div className="absolute" style={{ top: 6, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#591427' }} />
      {/* Screen */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFDF5', aspectRatio: '4 / 3', border: '1px solid rgba(122,24,50,0.1)' }}
      >
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white" style={{ background: '#7A1832' }}>✦</div>
            <span className="text-[9px] font-bold" style={{ color: '#591427' }}>Mi Marca BRÄVE</span>
          </div>
          {/* Strategy sections */}
          <div className="space-y-1.5">
            {[
              { t: 'Perfil BRÄVE', c: '#7A1832', w: '90%' },
              { t: 'Clienta ideal', c: '#2a5a6a', w: '75%' },
              { t: 'Estrategia contenido', c: '#7a6000', w: '85%' },
              { t: 'Pilares de contenido', c: '#7A1832', w: '70%' },
              { t: 'Plan de acción', c: '#2a5a6a', w: '80%' },
            ].map((s, i) => (
              <div key={i} className="rounded-md p-1.5" style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                  <span className="text-[7px] font-bold" style={{ color: '#591427' }}>{s.t}</span>
                </div>
                <div className="mt-1 h-1 rounded-full" style={{ background: 'rgba(122,24,50,0.1)' }}>
                  <div className="h-1 rounded-full" style={{ width: s.w, background: s.c }} />
                </div>
              </div>
            ))}
          </div>
          {/* Bravi chip */}
          <div className="mt-2 rounded-md p-1.5 flex items-center gap-1" style={{ background: 'rgba(255,241,181,0.4)' }}>
            <span className="text-[10px]">🤖</span>
            <span className="text-[7px] font-medium" style={{ color: '#591427' }}>Estrategia lista ✨</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── iPhone showing Stories (real Instagram-like) ───────────────────
export function IPhoneStoriesReal() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 170,
        borderRadius: 28,
        padding: 7,
        background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
        border: '2px solid rgba(89,20,39,0.15)',
        boxShadow: 'var(--shadow-strong)',
      }}
    >
      {/* Notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: 7, width: 56, height: 13, background: '#591427', borderRadius: '0 0 10px 10px' }} />
      {/* Screen */}
      <div className="rounded-3xl overflow-hidden relative" style={{ aspectRatio: '9 / 19' }}>
        {/* Story image — balayage */}
        <div style={{ position: 'absolute', inset: 0, background: BALAYAGE_GRADIENTS.honey }} />
        {/* Dark gradient overlay for text legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.55) 100%)' }} />
        {/* Top progress bars */}
        <div className="flex gap-0.5 px-2 pt-2.5 relative z-10">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-0.5 rounded-full" style={{ background: i === 0 ? 'white' : 'rgba(255,255,255,0.4)' }} />
          ))}
        </div>
        {/* Top user bar */}
        <div className="flex items-center gap-1.5 px-2.5 pt-2 relative z-10">
          <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold" style={{ background: '#7A1832' }}>✦</div>
          <span className="text-[7px] font-bold text-white">brave.studio</span>
          <span className="text-[6px] text-white opacity-70">2h</span>
        </div>
        {/* Centered text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 z-10">
          <p className="text-[11px] font-bold text-white text-center leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            ¿Tu color dura menos de un mes?
          </p>
        </div>
        {/* Bottom poll */}
        <div className="absolute bottom-3 left-0 right-0 px-2.5 z-10">
          <div className="rounded-lg px-2 py-1 flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}>
            <span className="text-[7px] text-white font-semibold">📊 Encuesta</span>
            <span className="text-[7px] text-white opacity-80">Sí · No</span>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-1">
            <span className="text-[8px]">💌</span>
            <span className="text-[6px] text-white font-semibold">Escribe BALAYAGE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── iPhone showing Instagram post with floating stats ──────────────
export function IPhoneInstagramPost() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 200,
        borderRadius: 30,
        padding: 8,
        background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
        border: '2px solid rgba(89,20,39,0.15)',
        boxShadow: 'var(--shadow-strong)',
      }}
    >
      {/* Notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: 8, width: 64, height: 15, background: '#591427', borderRadius: '0 0 11px 11px' }} />
      {/* Screen */}
      <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--color-cream)', aspectRatio: '9 / 16' }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-3 pt-2.5 text-[8px] font-semibold text-cherry-dark">
          <span>9:41</span>
          <span>●●●●</span>
        </div>
        {/* Post header */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white" style={{ background: 'var(--color-cherry)' }}>✦</div>
          <span className="text-[9px] font-bold text-cherry-dark">brave.studio</span>
          <span className="ml-auto text-[9px] text-cherry-dark opacity-50">⋯</span>
        </div>
        {/* Balayage image */}
        <div style={{ aspectRatio: '4 / 5', background: BALAYAGE_GRADIENTS.copper }} />
        {/* Actions */}
        <div className="flex items-center gap-2.5 px-3 pt-2">
          <span className="text-[11px]">❤️</span>
          <span className="text-[11px]">💬</span>
          <span className="text-[11px]">📤</span>
          <span className="ml-auto text-[10px]">🔖</span>
        </div>
        <p className="px-3 pt-1 text-[8px] font-bold text-cherry-dark">1.289 me gusta</p>
        <p className="px-3 pt-0.5 text-[8px] leading-tight text-cherry-dark">
          <strong>brave.studio</strong> Balayage premium hecho a mano ✨
        </p>
      </div>

      {/* Floating stat badges around the phone */}
      <FloatingBadge top="-4%" left="-12%" delay={0}>
        <span style={{ color: '#7A1832' }}>❤️ +1289</span>
      </FloatingBadge>
      <FloatingBadge top="28%" right="-14%" delay={0.3}>
        <span style={{ color: '#2a5a6a' }}>💬 86 comentarios</span>
      </FloatingBadge>
      <FloatingBadge top="52%" left="-15%" delay={0.6}>
        <span style={{ color: '#2a8a4a' }}>📈 +412 seguidores</span>
      </FloatingBadge>
      <FloatingBadge bottom="18%" right="-13%" delay={0.9}>
        <span style={{ color: '#7A1832' }}>📅 18 reservas</span>
      </FloatingBadge>
      <FloatingBadge bottom="-2%" left="-8%" delay={1.2}>
        <span style={{ color: '#c0394e' }}>🔥 Reel viral</span>
      </FloatingBadge>
      <FloatingBadge top="10%" right="-10%" delay={1.5} small>
        <span style={{ color: '#7a6000' }}>✨ 2,3M views</span>
      </FloatingBadge>
    </div>
  )
}

function FloatingBadge({
  children, top, bottom, left, right, delay = 0, small = false,
}: {
  children: React.ReactNode
  top?: string; bottom?: string; left?: string; right?: string
  delay?: number; small?: boolean
}) {
  return (
    <div
      className="absolute z-30 hidden sm:block"
      style={{
        top, bottom, left, right,
        animation: `bravi-float 3.5s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        className="rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap"
        style={{
          background: 'white',
          boxShadow: 'var(--shadow-medium)',
          fontSize: small ? 9 : 10,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── iPhone showing Reel creation ───────────────────────────────────
export function IPhoneCrearReel() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 180,
        borderRadius: 28,
        padding: 7,
        background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
        border: '2px solid rgba(89,20,39,0.15)',
        boxShadow: 'var(--shadow-strong)',
      }}
    >
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: 7, width: 58, height: 14, background: '#591427', borderRadius: '0 0 10px 10px' }} />
      <div className="rounded-3xl overflow-hidden" style={{ background: '#FFFDF5', aspectRatio: '9 / 19' }}>
        <div className="flex items-center justify-between px-3 pt-2.5 text-[7px] font-semibold text-cherry-dark">
          <span>9:41</span>
          <span>●●●●</span>
        </div>
        <div className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white" style={{ background: '#7A1832' }}>✦</div>
            <span className="text-[8px] font-bold" style={{ color: '#591427' }}>Crear Reel</span>
          </div>
          {/* Script blocks */}
          <div className="space-y-1.5">
            {[
              { l: 'GANCHO', c: '#7A1832', t: '¿Cansada de que tu color no dure?' },
              { l: 'CONTEXTO', c: '#2a5a6a', t: 'El secreto está en la preparación…' },
              { l: 'SOLUCIÓN', c: '#7a6000', t: 'Analizo tu cabello antes de empezar' },
              { l: 'CTA', c: '#7A1832', t: 'Reserva tu consulta gratis' },
            ].map((b, i) => (
              <div key={i} className="rounded-md p-1.5" style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}>
                <span className="text-[6px] font-bold uppercase" style={{ color: b.c }}>{b.l}</span>
                <p className="text-[7px] leading-tight mt-0.5" style={{ color: '#1a1a1a' }}>{b.t}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 py-1.5 rounded-lg text-center text-[8px] font-bold text-white" style={{ background: '#7A1832' }}>
            Copiar guion ✨
          </div>
        </div>
      </div>
    </div>
  )
}

// ── iMac showing Dashboard ─────────────────────────────────────────
export function IMacDashboard() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 560 }}>
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
          border: '2px solid rgba(89,20,39,0.12)',
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#FFFDF5', aspectRatio: '16 / 10', border: '1px solid rgba(122,24,50,0.1)' }}
        >
          <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: '#F5F0E8', borderBottom: '1px solid rgba(122,24,50,0.08)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#e85a5a' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#f0c14a' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#6ec06e' }} />
            <div className="flex-1 mx-2 px-2 py-0.5 rounded-md text-[8px]" style={{ background: 'white', color: '#591427', opacity: 0.5 }}>
              bravestudio.app/inicio
            </div>
          </div>
          <div className="p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white" style={{ background: '#7A1832' }}>✦</div>
              <span className="text-[9px] font-bold" style={{ color: '#591427' }}>Hola, Laura 👋</span>
            </div>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[
                { l: 'Ideas', v: '24', c: '#7A1832' },
                { l: 'Agenda', v: '8', c: '#2a5a6a' },
                { l: 'Racha', v: '12d', c: '#7a6000' },
                { l: 'Nivel', v: '3', c: '#2a8a4a' },
              ].map((s, i) => (
                <div key={i} className="rounded-md p-1.5" style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}>
                  <span className="text-[6px]" style={{ color: '#591427', opacity: 0.6 }}>{s.l}</span>
                  <p className="text-[10px] font-bold" style={{ color: s.c }}>{s.v}</p>
                </div>
              ))}
            </div>
            {/* Plan cards */}
            <div className="space-y-1">
              {[
                { t: 'Reel: La verdad sobre el balayage', c: '#7A1832' },
                { t: 'Carrusel: 5 señales de un buen rubio', c: '#2a5a6a' },
                { t: 'Story: Caja de preguntas sobre keratina', c: '#7a6000' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-md" style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}>
                  <span className="w-2 h-2 rounded flex-shrink-0" style={{ background: r.c }} />
                  <span className="text-[7px] font-semibold truncate" style={{ color: '#1a1a1a' }}>{r.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto" style={{ width: 120, height: 18, background: 'linear-gradient(180deg, #d8d0c4, #b8aea0)', clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)' }} />
      <div className="mx-auto rounded-b-lg" style={{ width: 180, height: 6, background: '#a89e90' }} />
    </div>
  )
}

export { BALAYAGE_GRADIENTS }