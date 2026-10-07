import Link from 'next/link'
import {
  Lock, Package, LayoutTemplate, Wand2, Image as ImageIcon,
  Target, Download, Sparkles, CircleCheck,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionTitle from '@/components/ui/SectionTitle'

/**
 * STORIES DISEÑO — teaser (Fase 1). Vista informativa "en construcción":
 * qué será, cómo funcionará y estado. Sin estado React (server component).
 */
const PODRAS = [
  { icon: Package, title: 'Elegir packs por objetivo', desc: 'Secuencias completas de stories pensadas para un objetivo: vender, captar, educar o fidelizar.' },
  { icon: LayoutTemplate, title: 'Usar plantillas de diseño en serio', desc: 'Plantillas profesionales compuestas por diseño: tú solo cambias lo tuyo, el estilo ya está hecho.' },
  { icon: Wand2, title: 'Textos adaptados con IA', desc: 'BRÄVE reescribe cada texto con tu tono y los datos de tu salón. Nada de rellenar huecos.' },
  { icon: ImageIcon, title: 'Tus fotos o las nuestras', desc: 'Cada hueco de foto acepta una imagen de ejemplo del pack o la foto real de tu salón.' },
  { icon: Target, title: 'Stories con propósito', desc: 'Para vender, educar, responder objeciones, mostrar resultados y captar clientas nuevas.' },
  { icon: Download, title: 'Exportar tus listas', desc: 'Exporta la secuencia story a story, lista para publicar en Instagram sin retoques.' },
]

const COMO = [
  'Elige tu objetivo',
  'Escoge el pack de plantillas',
  'BRÄVE adapta los textos con IA',
  'Cambia las fotos por las tuyas',
  'Revisa la secuencia entera',
  'Exporta y publica',
]

const TIPOS = [
  ['Stories que venden', 'Presentan un servicio con historia y cierre suave'],
  ['Resultados de clientas', 'Casos reales con foto, proceso y duración'],
  ['Respuesta a objeciones', '“me queda caro”, “no tengo tiempo” — respondidas en story'],
  ['Antes y después', 'El cambio visual como prueba directa'],
  ['Tratamiento destacado', 'Un servicio explicado paso a paso'],
  ['Promociones', 'Lanzamientos y ofertas sin parecer desesperadas'],
  ['Encuesta', 'Interacción pura: entrena el algoritmo y da datos'],
  ['Caja de preguntas', 'Responde dudas y abre conversación en privado'],
  ['Autoridad', 'Tips de experta que posicionan tu criterio'],
  ['Agenda con huecos', 'Anuncias huecos de la semana sin rebajar'],
  ['Lead magnet', 'Regalo descargable para captar seguidoras'],
]

export default function StoriesDisenoClient() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      {/* HERO */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'var(--color-buttermilk)', color: 'var(--color-cherry-dark)' }}>
          <Lock size={12} aria-hidden="true" />
          En construcción
        </span>
        <h1 className="text-[32px] sm:text-[40px] font-extrabold text-cherry-dark leading-tight mt-4" style={{ letterSpacing: '-1px' }}>
          Stories Diseño
        </h1>
        <p className="mt-3 text-sm sm:text-base text-cherry-dark opacity-75 leading-relaxed">
          Crea secuencias de stories visuales con plantillas profesionales, textos adaptados con IA y la posibilidad de usar tus propias fotos.
        </p>
        <p className="mt-2 text-xs font-semibold text-cherry-dark opacity-50">
          La herramienta de diseño de stories de BRÄVE. Te la estamos construyendo.
        </p>
      </div>

      {/* QUÉ PODRÁS HACER */}
      <section className="mt-12">
        <SectionTitle title="Qué podrás hacer" subtitle="Seis cosas que esta sección hará por ti desde el primer día." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {PODRAS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-4 rounded-[var(--radius-md)] flex flex-col gap-2.5"
              style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.08)' }}
            >
              <span className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'rgba(122,24,50,0.10)' }}>
                <Icon size={20} className="text-cherry" aria-hidden="true" />
              </span>
              <p className="text-[14px] font-bold text-cherry-dark leading-snug">{title}</p>
              <p className="text-xs text-cherry-dark opacity-65 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONARÁ */}
      <section className="mt-12">
        <SectionTitle title="Cómo funcionará" subtitle="De “quiero vender un tratamiento” a la secuencia publicada, en una sola sesión." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {COMO.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)]"
              style={{ background: 'white', border: '1px solid rgba(122,24,50,0.08)' }}
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold shrink-0"
                style={{ background: 'var(--color-cherry)', color: 'white' }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="text-[13px] font-semibold text-cherry-dark leading-snug">{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TIPOS DE STORIES */}
      <section className="mt-12">
        <SectionTitle title="Tipos de stories" subtitle="Todos los packs se construyen con este vocabulario — cada tipo tiene su plantilla." />
        <div className="grid sm:grid-cols-2 gap-2.5 mt-5">
          {TIPOS.map(([tipo, desc]) => (
            <div
              key={tipo}
              className="flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)]"
              style={{ background: 'white', border: '1px solid rgba(122,24,50,0.08)' }}
            >
              <CircleCheck size={16} className="text-cherry shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[13px] leading-snug text-cherry-dark">
                <span className="font-bold">{tipo}</span>
                <span className="opacity-60"> — {desc}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ESTADO ACTUAL */}
      <section className="mt-12">
        <div
          className="p-5 sm:p-7 rounded-[var(--radius-lg)] text-center"
          style={{ background: 'var(--color-cream)', border: '1.5px solid rgba(122,24,50,0.12)' }}
        >
          <Sparkles size={22} className="mx-auto text-cherry" aria-hidden="true" />
          <p className="mt-3 text-[15px] sm:text-base font-bold text-cherry-dark">
            Estamos construyendo esta herramienta…
          </p>
          <p className="mt-1.5 text-[13px] text-cherry-dark opacity-70 leading-relaxed max-w-md mx-auto">
            Las plantillas, los packs y el editor entran en la siguiente fase.
            Cuando esté lista, la encontrarás aquí mismo — tu cuenta ya está preparada para ella.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="primary" disabled icon={<Lock size={14} aria-hidden="true" />}>
              Disponible próximamente
            </Button>
            <Link href="/stories" className="text-[13px] font-bold text-cherry underline underline-offset-4">
              Mientras tanto: Stories BRÄVE ya está lista
            </Link>
          </div>
          <div className="mt-4 flex justify-center">
            <Badge tone="neutral">En desarrollo · Fase 2 — Stories Diseño</Badge>
          </div>
        </div>
      </section>
    </div>
  )
}