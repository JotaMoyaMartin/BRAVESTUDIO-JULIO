'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { demoGetBrand, demoSaveBrand } from '@/lib/demo-store'
import { BrandProfile } from '@/types/database'
import { Sparkles, Star } from 'lucide-react'
import { buildProfile } from '@/lib/brand-extract'
import VoiceButton from '@/components/VoiceButton'

const QUESTION_BLOCKS = [
  {
    title: 'Sobre tu salón',
    questions: [
      '¿Cómo se llama tu salón?',
      '¿En qué ciudad estás?',
      '¿Cuántos años llevas trabajando?',
      '¿Trabajas sola o tienes equipo?',
    ],
  },
  {
    title: 'Servicios',
    questions: [
      '¿Qué servicios realizas?',
      '¿Cuáles son tus 3 servicios principales?',
      '¿Qué servicio quieres potenciar?',
      '¿Qué servicio te deja más beneficio?',
    ],
  },
  {
    title: 'Clienta ideal',
    questions: [
      '¿Qué tipo de clienta quieres atraer?',
      '¿Qué problemas suele tener tu clienta?',
      '¿Qué desea conseguir cuando reserva contigo?',
      '¿Qué dudas te preguntan con frecuencia?',
    ],
  },
  {
    title: 'Contenido y objetivos',
    questions: [
      '¿Qué objetivo tienes ahora mismo?',
      '¿Sobre qué temas quieres crear más contenido?',
      '¿Qué te diferencia de otros salones?',
    ],
  },
]

// Known services and extraction helpers live in `@/lib/brand-extract`.
// VoiceButton lives in `@/components/VoiceButton`.

export default function MiMarcaClient({ userId, brand }: { userId: string; brand: BrandProfile | null }) {
  const isDemoMode = userId === 'demo'
  const [text, setText] = useState(brand?.raw_input || brand?.optimized_summary || '')
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<BrandProfile> | null>(
    brand?.optimized_summary ? brand : null
  )

  // In demo mode, hydrate from localStorage.
  useEffect(() => {
    if (isDemoMode) {
      const stored = demoGetBrand() as Partial<BrandProfile> | null
      if (stored) {
        setText((stored.raw_input as string) || (stored.optimized_summary as string) || '')
        if (stored.optimized_summary) setProfile(stored)
      }
    }
  }, [])

  async function generateProfile() {
    if (!text.trim()) return
    setSaving(true)
    const extracted = buildProfile(text)
    const payload = {
      user_id: userId,
      raw_input: text,
      ...extracted,
      completion_status: (text.trim().length > 40 ? 'complete' : 'partial') as 'complete' | 'partial',
      updated_at: new Date().toISOString(),
    }

    if (isDemoMode) {
      demoSaveBrand(payload)
    } else {
      const supabase = createClient()
      if (brand?.id) {
        await supabase.from('brand_profiles').update(payload).eq('id', brand.id)
      } else {
        await supabase.from('brand_profiles').insert(payload as unknown as BrandProfile)
      }
    }

    setProfile(payload as Partial<BrandProfile>)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>Mi Marca BRÄVE</h1>
        <p className="mt-1 text-sm" style={{ color: '#591427', opacity: 0.8 }}>
          Cuéntanos la información de tu salón para que la app genere contenido más personalizado.
        </p>
      </div>

      {/* Bravi message */}
      <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: '#FFF1B5' }}>
        <span className="text-xl">🤖</span>
        <p className="text-sm" style={{ color: '#591427' }}>
          <strong>Bravi dice:</strong> Escribe todo de una vez o usa la voz. No tienes que rellenar campos: cuéntalo a tu manera respondiendo las preguntas de abajo.
        </p>
      </div>

      {/* Main input */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
        <textarea
          rows={10}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe aquí toda la información de tu salón o responde las preguntas de abajo…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ border: '1.5px solid rgba(122,24,50,0.2)', background: '#FFFDF5', lineHeight: 1.6 }}
        />
        <VoiceButton onTranscript={t => setText(prev => (prev ? prev + ' ' + t : t))} />
        <button
          onClick={generateProfile}
          disabled={saving || !text.trim()}
          className="btn-primary w-full justify-center text-base py-3.5"
          style={{ opacity: !text.trim() ? 0.5 : 1 }}
        >
          <Sparkles size={18} />
          {saving ? 'Generando tu perfil...' : '✨ Generar Perfil BRÄVE'}
        </button>
      </div>

      {/* Question guide */}
      <div className="space-y-4">
        <p className="text-sm font-semibold" style={{ color: '#591427' }}>
          Preguntas que puedes responder en el cuadro de arriba:
        </p>
        {QUESTION_BLOCKS.map(block => (
          <div key={block.title} className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(255,241,181,0.8)' }}>
            <p className="font-bold text-sm mb-3" style={{ color: '#7A1832' }}>{block.title}</p>
            <ul className="space-y-2">
              {block.questions.map(q => (
                <li key={q} className="flex items-start gap-2 text-sm" style={{ color: '#1a1a1a' }}>
                  <span style={{ color: '#7A1832', opacity: 0.5 }}>•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Profile result card */}
      {profile?.optimized_summary && (
        <ProfileCard profile={profile} />
      )}
    </div>
  )
}

function ProfileCard({ profile }: { profile: Partial<BrandProfile> }) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: 'Nombre del salón', value: profile.salon_name },
    { label: 'Ciudad', value: profile.city },
    { label: 'Servicios principales', value: (profile.main_services || []).join(', ') || null },
    { label: 'Servicio prioritario', value: profile.service_to_promote },
    { label: 'Clienta ideal', value: profile.ideal_client },
    { label: 'Problemas habituales', value: profile.client_problems },
    { label: 'Objetivo principal', value: profile.main_goal },
    { label: 'Temas de contenido', value: (profile.content_topics || []).join(', ') || null },
    { label: 'Diferenciación', value: profile.differentiation },
  ]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '2px solid #7A1832' }}>
      <div className="px-5 py-4 flex items-center gap-2" style={{ background: '#7A1832' }}>
        <Star size={18} style={{ color: 'white' }} />
        <h3 className="font-bold text-white">Tu Perfil BRÄVE</h3>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-xs" style={{ color: '#591427', opacity: 0.7 }}>
          ✓ Guardado. La app usará esta información para personalizar tu contenido.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map(r => (
            <div key={r.label} className="p-3 rounded-xl" style={{ background: '#FFFDF5', border: '1px solid rgba(255,241,181,0.8)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7A1832', opacity: 0.6 }}>{r.label}</p>
              <p className="text-sm mt-1" style={{ color: r.value ? '#1a1a1a' : '#999' }}>{r.value || '—'}</p>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl" style={{ background: '#C1DBE8' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#2a5a6a', opacity: 0.7 }}>Resumen para la IA</p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1a3a4a' }}>{profile.optimized_summary}</p>
        </div>
      </div>
    </div>
  )
}
