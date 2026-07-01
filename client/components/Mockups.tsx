'use client'

/**
 * CSS-only device mockups for the landing page.
 * Pure presentational — no real screenshots. Uses the BRÄVE palette
 * to simulate the planification view on a desktop and the stories
 * view on a phone.
 */

export function IMacMockup() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 560 }}>
      {/* Screen bezel */}
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
          border: '2px solid rgba(89,20,39,0.12)',
          boxShadow: '0 20px 50px rgba(89,20,39,0.18)',
        }}
      >
        {/* Screen */}
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
              bravestudio.app/planificar
            </div>
          </div>
          {/* App content — planification */}
          <div className="p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white" style={{ background: '#7A1832' }}>✦</div>
              <span className="text-[9px] font-bold" style={{ color: '#591427' }}>Planificación</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[7px] font-bold text-white" style={{ background: '#7A1832' }}>Octubre</span>
            </div>
            {/* Plan cards */}
            <div className="space-y-1.5">
              {[
                { t: 'La verdad sobre el balayage que nadie te cuenta', s: 'Balayage', c: '#7A1832' },
                { t: '5 señales de que necesitas un rubio profesional', s: 'Rubios', c: '#2a5a6a' },
                { t: 'Antes y después: transformación real con keratina', s: 'Keratina', c: '#7a6000' },
                { t: 'Por qué el alisado no dura como en las fotos', s: 'Alisados', c: '#7A1832' },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-1.5 rounded-md"
                  style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}
                >
                  <span className="w-3 h-3 rounded flex items-center justify-center text-[6px] text-white font-bold" style={{ background: row.c }}>
                    {row.s[0]}
                  </span>
                  <span className="text-[8px] font-semibold truncate" style={{ color: '#1a1a1a' }}>{row.t}</span>
                  <span className="ml-auto px-1 py-0.5 rounded text-[6px]" style={{ background: '#FFF1B5', color: '#591427' }}>
                    {row.s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Stand */}
      <div className="mx-auto" style={{ width: 120, height: 18, background: 'linear-gradient(180deg, #d8d0c4, #b8aea0)', clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)' }} />
      <div className="mx-auto rounded-b-lg" style={{ width: 180, height: 6, background: '#a89e90' }} />
    </div>
  )
}

export function IPhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 180,
        borderRadius: 28,
        padding: 8,
        background: 'linear-gradient(145deg, #f5f0e8, #e8dfd0)',
        border: '2px solid rgba(89,20,39,0.15)',
        boxShadow: '0 15px 40px rgba(89,20,39,0.2)',
      }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: 8, width: 60, height: 14, background: '#591427', borderRadius: '0 0 10px 10px' }}
      />
      {/* Screen */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: '#FFFDF5', aspectRatio: '9 / 19', border: '1px solid rgba(122,24,50,0.1)' }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-3 pt-2 text-[7px] font-semibold" style={{ color: '#591427' }}>
          <span>9:41</span>
          <span>●●●●</span>
        </div>
        {/* Stories content */}
        <div className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white" style={{ background: '#7A1832' }}>✦</div>
            <span className="text-[8px] font-bold" style={{ color: '#591427' }}>Stories BRÄVE</span>
          </div>
          <div className="space-y-1.5">
            {[
              { n: 1, r: 'Problema', t: '¿Tu balayage no está durando?', c: '#7A1832' },
              { n: 2, r: 'Autoridad', t: 'Antes de empezar, analizo el cabello…', c: '#2a5a6a' },
              { n: 3, r: 'Resultado', t: 'Escribe BALAYAGE y te asesoro 💌', c: '#7a6000' },
            ].map((s) => (
              <div key={s.n} className="rounded-lg p-1.5" style={{ background: 'white', border: '1px solid rgba(255,241,181,0.8)' }}>
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-3 h-3 rounded flex items-center justify-center text-[6px] text-white font-bold" style={{ background: s.c }}>
                    {s.n}
                  </span>
                  <span className="text-[6px] font-semibold" style={{ color: s.c }}>{s.r}</span>
                </div>
                <p className="text-[7px] leading-tight" style={{ color: '#1a1a1a' }}>{s.t}</p>
              </div>
            ))}
          </div>
          {/* CTA */}
          <div className="mt-2 py-1.5 rounded-lg text-center text-[7px] font-bold text-white" style={{ background: '#7A1832' }}>
            Crear Stories ✨
          </div>
        </div>
      </div>
    </div>
  )
}

export function DeviceMockups() {
  return (
    <div className="relative w-full flex items-end justify-center gap-4 sm:gap-8">
      <div className="relative z-10 flex-shrink-0" style={{ flex: '1 1 auto', maxWidth: 560 }}>
        <IMacMockup />
      </div>
      <div className="flex-shrink-0" style={{ marginBottom: -8 }}>
        <IPhoneMockup />
      </div>
    </div>
  )
}