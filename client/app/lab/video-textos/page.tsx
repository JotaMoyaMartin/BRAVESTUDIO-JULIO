'use client'
/* TEMPORAL (vídeo Lucía): rótulos del vídeo con las letras de la app, fondo
   transparente, 1080×1920. ?k=TEXTO GRANDE&s=subtítulo&n=notificación. */
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function Inner() {
  const q = useSearchParams()
  const k = q.get('k') || ''
  const s = q.get('s') || ''
  const n = q.get('n') || ''
  const alto = q.get('pos') === 'arriba'
  useEffect(() => { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent' }, [])
  return (
    <div style={{ width: 1080, height: 1920, position: 'relative', background: 'transparent', fontFamily: 'var(--font-montserrat), sans-serif' }}>
      {n && (
        <div style={{ position: 'absolute', top: 250, left: 90, right: 90, display: 'flex', gap: 24, alignItems: 'center', background: 'rgba(255,247,238,0.97)', borderRadius: 40, padding: '30px 36px', boxShadow: '0 20px 60px rgba(20,6,10,0.35)' }}>
          <div style={{ width: 96, height: 96, borderRadius: 26, background: '#591427', color: '#FFF7EE', fontWeight: 800, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>B</div>
          <div>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#7A1832' }}>Tu tutora · ahora</p>
            <p style={{ margin: '6px 0 0', fontSize: 38, fontWeight: 600, color: '#2B1A1F', lineHeight: 1.25 }}>{n}</p>
          </div>
        </div>
      )}
      {k && (
        <p style={{ position: 'absolute', left: 70, right: 70, top: alto ? 250 : 1190, margin: 0, textAlign: 'center', fontWeight: 800, fontSize: k.length > 18 ? 84 : 104, lineHeight: 1.02, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#FFFFFF', textShadow: '0 6px 30px rgba(20,6,10,0.55), 0 2px 6px rgba(20,6,10,0.5)' }}>
          {k}
        </p>
      )}
      {s && (
        <div style={{ position: 'absolute', left: 90, right: 90, top: alto ? 1560 : 1440, display: 'flex', justifyContent: 'center' }}>
          <p style={{ margin: 0, textAlign: 'center', fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: '#FFFFFF', background: 'rgba(43,26,31,0.62)', borderRadius: 22, padding: '14px 26px' }}>{s}</p>
        </div>
      )}
    </div>
  )
}
export default function Page() { return <Suspense><Inner /></Suspense> }
