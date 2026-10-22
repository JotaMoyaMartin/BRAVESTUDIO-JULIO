'use client'
/* TEMPORAL (vídeo Lucía): pantallas de muestra de BRÄVE Studio con contenido
   lleno, con el diseño real de la app. ?s=1..6 · 390×844. Se borra después. */
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PlayCircle, CheckCircle2, Sparkles, CalendarDays, Images, LayoutGrid, Film, MessageCircle, Download, Send } from 'lucide-react'
import ComposedSlide from '@/components/carruseles/ComposedSlide'
import type { SlideDesign } from '@/lib/carruseles/composer'

const ph = (f: string) => `/banco-ia/${f}.jpg`

function Bar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-12 pb-3 bg-white border-b border-borde">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-burdeos text-crema text-[13px] font-bold flex items-center justify-center">B</span>
        <span className="text-[15px] font-bold text-burdeos">BRÄVE Studio</span>
      </div>
      <span className="text-[12px] font-semibold text-cereza bg-rosa px-3 py-1.5 rounded-full">{title}</span>
    </div>
  )
}

function Academia() {
  const clases = [
    { t: 'Tu primer reel en 20 minutos', m: '12 min', f: 'salon/estilista-manos', done: true },
    { t: 'Ganchos que paran el dedo', m: '9 min', f: 'rubios/rubio-corte-tijera', done: true },
    { t: 'Fotos de resultado que venden', m: '14 min', f: 'melenas/melena-ondas-caramelo', done: false, now: true },
    { t: 'Tu mes planificado en 1 hora', m: '11 min', f: 'herramientas/flatlay-blanco', done: false },
  ]
  return (
    <>
      <Bar title="Academia" />
      <div className="px-5 py-4 space-y-4">
        <div className="relative rounded-3xl overflow-hidden h-[210px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph('melenas/melena-ondas-caramelo')} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2B1A1F]/85 via-[#2B1A1F]/20 to-transparent" />
          <PlayCircle className="absolute top-4 right-4 text-white" size={40} strokeWidth={1.5} />
          <div className="absolute left-4 right-4 bottom-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mantequilla">Módulo 2 · Clase 3</p>
            <p className="text-[19px] font-bold leading-tight mt-1">Fotos de resultado que venden</p>
            <div className="mt-2.5 h-1.5 rounded-full bg-white/30"><div className="h-full w-[62%] rounded-full bg-mantequilla" /></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold text-burdeos">Estilistas de Éxito</p>
          <p className="text-[12px] font-semibold text-cereza">8 de 24 clases</p>
        </div>
        <div className="space-y-2.5">
          {clases.map(c => (
            <div key={c.t} className={`flex items-center gap-3 p-2.5 rounded-2xl bg-white border ${c.now ? 'border-cereza' : 'border-borde'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph(c.f)} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-tinta leading-snug">{c.t}</p>
                <p className="text-[12px] text-tinta-2 mt-0.5">{c.m}</p>
              </div>
              {c.done ? <CheckCircle2 className="text-[#2F7A4B]" size={22} /> : <PlayCircle className="text-cereza" size={22} />}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Calendario() {
  const tipos: Record<string, [string, string]> = { R: ['Reel', '#7A1832'], C: ['Carrusel', '#C58A2B'], S: ['Stories', '#B05B70'] }
  const plan: Record<number, string> = { 1: 'R', 3: 'C', 5: 'S', 6: 'R', 8: 'C', 10: 'R', 12: 'S', 13: 'C', 15: 'R', 17: 'C', 19: 'S', 20: 'R', 22: 'C', 24: 'R', 26: 'S', 27: 'C', 29: 'R', 31: 'S' }
  const days = Array.from({ length: 35 }, (_, i) => i - 2)
  return (
    <>
      <Bar title="Mi mes" />
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-[22px] font-bold text-burdeos">Noviembre</p>
          <p className="text-[13px] text-tinta-2">18 publicaciones listas · plan creado con IA</p>
        </div>
        <div className="flex gap-2">
          {Object.values(tipos).map(([n, c]) => (
            <span key={n} className="flex items-center gap-1.5 text-[12px] font-semibold text-tinta bg-white border border-borde rounded-full px-2.5 py-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{n}
            </span>
          ))}
        </div>
        <div className="rounded-3xl bg-white border border-borde p-3">
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-tinta-2 mb-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(d => {
              const t = plan[d]
              return (
                <div key={d} className={`h-[52px] rounded-xl flex flex-col items-center justify-start pt-1 ${d < 1 || d > 30 ? 'opacity-0' : t ? '' : 'bg-crema'}`}
                  style={t ? { background: tipos[t][1] + '1F' } : undefined}>
                  <span className="text-[12px] font-semibold text-tinta">{d}</span>
                  {t && <span className="mt-1 w-[80%] h-[14px] rounded-md text-[8px] font-bold text-white flex items-center justify-center" style={{ background: tipos[t][1] }}>{tipos[t][0]}</span>}
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-2xl bg-mantequilla p-3.5 flex gap-3 items-start">
          <Sparkles className="text-burdeos flex-shrink-0 mt-0.5" size={18} />
          <p className="text-[13px] text-burdeos leading-snug"><b>Hoy toca:</b> reel «3 errores al lavar tu pelo en casa». El guion ya está listo.</p>
        </div>
      </div>
    </>
  )
}

const sd = (f: string, extra: Partial<SlideDesign> = {}): SlideDesign => ({ layout: 'silencio', fontPair: 'silencio-firma', scale: 1, tone: 'claro', overlay: 0.3, bg: { kind: 'photo', src: ph(f), source: 'banco' }, ...extra })

function Carrusel() {
  const slides = [
    { d: sd('rubios/rubio-corte-tijera', { label: 'Verdad nº 1' }), t: '**Un** buen corte hace más por tu pelo que diez productos' },
    { d: sd('morenas/morena-ondas-espalda'), t: '**Porque** la forma decide cómo cae' },
    { d: sd('tratamientos/mascarilla-nuca'), t: 'Si necesitas **mucho producto**, quizá el problema no es el producto' },
  ]
  return (
    <>
      <Bar title="Carruseles" />
      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="text-[12px] text-tinta-2">Estilo Silencio de Autor</p>
          <p className="text-[21px] font-bold text-burdeos">Tu carrusel está listo</p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <ComposedSlide design={slides[0].d} title={slides[0].t} index={0} total={5} />
        </div>
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <div key={i} className={`w-[30%] rounded-xl overflow-hidden ${i === 0 ? 'ring-2 ring-cereza' : ''}`}>
              <ComposedSlide design={s.d} title={s.t} index={i} total={5} />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="flex-1 flex items-center justify-center gap-1.5 bg-burdeos text-crema rounded-full py-3 text-[14px] font-semibold"><Download size={16} />Descargar las 5</span>
          <span className="flex items-center justify-center gap-1.5 bg-mantequilla text-burdeos rounded-full px-4 py-3 text-[14px] font-semibold"><CalendarDays size={16} />Programar</span>
        </div>
      </div>
    </>
  )
}

function Stories() {
  const st = [
    { f: 'rubios/rubio-balayage-espalda', t: '¿Rubio frío o cálido?', poll: true },
    { f: 'producto/serum-gota', t: 'El gesto de 10 segundos que cambia tu brillo' },
    { f: 'salon/sillon-vacio', t: 'Quedan 2 huecos este viernes' },
  ]
  return (
    <>
      <Bar title="Stories" />
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-[21px] font-bold text-burdeos">Secuencia lista</p>
          <p className="text-[13px] text-tinta-2">Conectar → Valor → Agenda · 3 stories</p>
        </div>
        <div className="flex gap-2.5">
          {st.map((s, i) => (
            <div key={i} className="relative flex-1 aspect-[9/16] rounded-2xl overflow-hidden shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph(s.f)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/25" />
              <p className="absolute left-2 right-2 top-[30%] text-center text-white text-[13px] leading-tight" style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 17 }}>{s.t}</p>
              {s.poll && <div className="absolute left-2 right-2 bottom-[18%] rounded-lg bg-white/90 text-[9px] font-bold text-tinta flex"><span className="flex-1 text-center py-1.5">FRÍO</span><span className="flex-1 text-center py-1.5 border-l border-borde">CÁLIDO</span></div>}
              <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/90 text-[10px] font-bold text-burdeos flex items-center justify-center">{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {['Ponle tu foto y descarga', 'Copiar las 3', 'Adaptar a mi salón'].map((b, i) => (
            <span key={b} className={`flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold ${i === 0 ? 'bg-burdeos text-crema' : 'bg-white border border-borde text-burdeos'}`}>
              {i === 0 ? <Images size={16} /> : i === 1 ? <LayoutGrid size={16} /> : <Sparkles size={16} />}{b}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

function Correccion() {
  return (
    <>
      <Bar title="Mi tutora" />
      <div className="px-5 py-4 space-y-3">
        <p className="text-[21px] font-bold text-burdeos">Corrección de tu reel</p>
        <div className="flex gap-3 items-start">
          <div className="relative w-[118px] aspect-[9/16] rounded-2xl overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph('melenas/melena-movimiento')} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <PlayCircle className="absolute inset-0 m-auto text-white" size={34} strokeWidth={1.5} />
          </div>
          <div className="space-y-2 flex-1">
            <div className="rounded-2xl rounded-tl-sm bg-white border border-borde p-3 text-[13px] text-tinta leading-snug">
              <b className="text-cereza">Seg. 0–1:</b> empieza directamente por el resultado 🔥
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-borde p-3 text-[13px] text-tinta leading-snug">
              <b className="text-cereza">Texto:</b> súbelo un poco, Instagram lo tapa.
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-borde p-3 text-[13px] text-tinta leading-snug">
              <b className="text-cereza">Final:</b> ¡ese CTA está perfecto! 👏
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-borde p-4">
          <p className="text-[13px] font-semibold text-tinta mb-2">Tu progreso esta semana</p>
          {[['Ganchos', 85], ['Constancia', 100], ['Llamadas a la acción', 70]].map(([n, v]) => (
            <div key={n} className="mb-2">
              <div className="flex justify-between text-[12px] text-tinta-2"><span>{n}</span><span>{v}%</span></div>
              <div className="h-2 rounded-full bg-rosa mt-1"><div className="h-full rounded-full bg-cereza" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white border border-borde pl-4 pr-1.5 py-1.5">
          <MessageCircle size={16} className="text-tinta-2" /><span className="flex-1 text-[13px] text-tinta-2">Responde a tu tutora…</span>
          <span className="w-9 h-9 rounded-full bg-burdeos flex items-center justify-center"><Send size={15} className="text-crema" /></span>
        </div>
      </div>
    </>
  )
}

function Guion() {
  return (
    <>
      <Bar title="Guiones" />
      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="text-[12px] text-tinta-2">Idea del día · Educa</p>
          <p className="text-[21px] font-bold text-burdeos leading-tight">3 errores al lavar tu pelo en casa</p>
        </div>
        {[['Gancho', 'Si te lavas el pelo así, estás apagando tu color.'], ['Desarrollo', 'Agua muy caliente, champú en las puntas y frotar con la toalla…'], ['Cierre', 'Guarda este vídeo y pídeme tu rutina en la próxima cita.']].map(([k, v], i) => (
          <div key={k} className={`rounded-2xl p-3.5 ${i === 0 ? 'bg-mantequilla' : 'bg-white border border-borde'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-cereza">{k}</p>
            <p className="text-[15px] text-tinta leading-snug mt-1">{v}</p>
          </div>
        ))}
        <div className="relative rounded-3xl overflow-hidden h-[250px] bg-tinta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph('salon/espejo-luz')} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div className="absolute inset-x-5 top-6 text-center">
            <p className="text-white/50 text-[15px]">Teleprompter</p>
            <p className="text-white text-[22px] font-semibold leading-snug mt-3">Si te lavas el pelo así, <span className="text-mantequilla">estás apagando tu color.</span></p>
          </div>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-4 border-white flex items-center justify-center"><span className="w-9 h-9 rounded-full bg-[#E5484D]" /></span>
          <Film className="absolute bottom-7 right-6 text-white/70" size={20} />
        </div>
      </div>
    </>
  )
}

const SCREENS = [Academia, Calendario, Carrusel, Stories, Correccion, Guion]

function Inner() {
  const q = useSearchParams()
  const S = SCREENS[Number(q.get('s') || 1) - 1] || Academia
  return <div className="w-[390px] h-[844px] overflow-hidden bg-crema"><S /></div>
}
export default function Page() { return <Suspense><Inner /></Suspense> }
