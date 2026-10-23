'use client'
/** Tu estrategia en 5 tarjetas: corta, visual y para aplicar ya. */
import { useState } from 'react'
import { AtSign, Check, Copy, Heart, Layers, Star, Timer } from 'lucide-react'
import type { Brave5 } from '@/lib/marca/brave5'

function Card({ n, icon, title, children, tone = 'white', id }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode; tone?: 'white' | 'burdeos' | 'mantequilla' | 'rosa'; id?: string }) {
  const cls = tone === 'burdeos' ? 'bg-burdeos text-crema' : tone === 'mantequilla' ? 'bg-mantequilla text-burdeos' : tone === 'rosa' ? 'bg-rosa text-burdeos' : 'bg-white text-ink border border-borde'
  return (
    <article id={id} className={`rounded-[var(--radius-lg)] p-5 space-y-3 ${cls}`} data-tone={tone === 'burdeos' ? 'dark' : undefined}>
      <header className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone === 'burdeos' ? 'bg-white/15' : 'bg-white/70'}`}>{icon}</span>
        <span className="text-[12px] font-semibold opacity-70 tabular-nums">{n}/5</span>
        <h3 className={`text-[17px] font-semibold ${tone === 'burdeos' ? '!text-crema' : ''}`}>{title}</h3>
      </header>
      {children}
    </article>
  )
}

const Dots = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5">{items.map(t => <li key={t} className="flex gap-2 text-[15px] leading-snug"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />{t}</li>)}</ul>
)

export default function StrategyCards({ b }: { b: Brave5 }) {
  const [copied, setCopied] = useState(false)
  const copyBio = async () => {
    try { await navigator.clipboard.writeText(b.bio); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* bloqueado */ }
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card n={1} icon={<Star size={18} aria-hidden />} title="Tu marca en una frase" tone="burdeos" id="bio">
        <p className="text-[20px] leading-snug font-semibold">{b.frase}</p>
        {b.bio && (
          <div className="rounded-2xl bg-white/10 p-3.5 space-y-2">
            <p className="text-[13px] font-semibold text-mantequilla flex items-center gap-1.5"><AtSign size={14} aria-hidden /> Tu bio de Instagram</p>
            <p className="text-[15px] whitespace-pre-line">{b.bio}</p>
            <button onClick={copyBio} className="inline-flex items-center gap-1.5 rounded-full bg-mantequilla text-burdeos px-3.5 py-1.5 text-[13px] font-semibold">
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? 'Copiada' : 'Copiar bio'}
            </button>
          </div>
        )}
      </Card>

      <Card n={2} icon={<Heart size={18} aria-hidden />} title="Tu clienta ideal" tone="rosa">
        <p className="text-[16px] font-medium">{b.clienta.quien}</p>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-[13px] font-semibold opacity-70 mb-1">Le preocupa</p><Dots items={b.clienta.preocupa} /></div>
          <div><p className="text-[13px] font-semibold opacity-70 mb-1">Quiere</p><Dots items={b.clienta.quiere} /></div>
        </div>
      </Card>

      <Card n={3} icon={<Star size={18} aria-hidden />} title={`Tu estrella: ${b.estrella.servicio}`} tone="mantequilla">
        <p className="text-[15px]">{b.estrella.porque}</p>
        <p className="text-[13px] font-semibold opacity-70">Cómo venderlo</p>
        <Dots items={b.estrella.como} />
      </Card>

      <Card n={4} icon={<Layers size={18} aria-hidden />} title="Tus 3 pilares de contenido">
        <div className="grid gap-2.5">
          {b.pilares.map((p, k) => (
            <div key={p.nombre} className="rounded-2xl bg-crema p-3">
              <p className="text-[15px] font-semibold text-burdeos">{k + 1}. {p.nombre} <span className="font-normal text-tinta-2">· {p.para_que}</span></p>
              <p className="text-[14px] text-tinta-2 mt-0.5">{p.ejemplos.join(' · ')}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card n={5} icon={<Timer size={18} aria-hidden />} title="Tu ritmo" >
        <div className="flex items-baseline gap-2">
          <span className="text-[44px] font-bold leading-none text-burdeos tabular-nums">{b.ritmo.semana}</span>
          <span className="text-[15px] text-tinta-2">publicaciones a la semana</span>
        </div>
        {b.ritmo.reparto && <p className="text-[15px]">{b.ritmo.reparto}</p>}
        {b.ritmo.tono && <p className="text-[15px] text-tinta-2">{b.ritmo.tono}</p>}
        {b.ritmo.consejo && <p className="rounded-2xl bg-mantequilla/70 text-burdeos p-3 text-[15px]"><b>Esta semana:</b> {b.ritmo.consejo.replace(/^Esta semana:\s*/i, '')}</p>}
      </Card>
    </div>
  )
}
