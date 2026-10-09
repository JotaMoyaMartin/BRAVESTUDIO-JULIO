'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, LayoutTemplate, Wand2, Upload, Image as ImageIcon,
  Download, Pencil, AlertTriangle,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  DesignTemplate, DesignBehavior, GeneratedPage, kindAspect, kindLabel, parseTemplate,
  behaviorOf, humanizeDesignError, fieldLabel, isTextField, maxLengthOf, visibleFields,
} from '@/lib/design'

/**
 * DISEÑOS · PLANTILLA — pantalla única:
 * IZQ  preview (sticky en desktop, arriba en móvil — SIEMPRE a la vista).
 * DER  campos de la plantilla (textos + fotos) → Generar → PNGs por página.
 *
 * Contratos (backend lo implementa en paralelo):
 *  GET  /api/design/templates/[id] · POST /api/design/photo
 *  POST /api/design/generate · POST /api/design/ai-texts
 */

interface Props {
  templateId: string
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

interface UploadedPhoto {
  path: string
  signedUrl: string
}

export default function TemplateClient({ templateId }: Props) {
  const toast = useToast()

  const [state, setState] = useState<LoadState>('loading')
  const [template, setTemplate] = useState<DesignTemplate | null>(null)

  const [texts, setTexts] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Record<string, UploadedPhoto>>({})
  const [aiBusy, setAiBusy] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [pages, setPages] = useState<GeneratedPage[] | null>(null)
  const [downAll, setDownAll] = useState(false)

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── Carga de la plantilla ────────────────────────────────────────
  const load = async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/design/templates/${templateId}`)
      if (res.status === 404) {
        setState('notfound')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      // El detalle puede venir como {template} u objeto directo (tolerancia).
      const parsed = parseTemplate((data as { template?: unknown })?.template ?? data)
      if (!parsed) {
        setState('notfound')
        return
      }
      setTemplate(parsed)
      setPages(null)
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  // Campos editables: textos + imágenes (chart/sheet quedan del lado del equipo).
  const editFields = template
    ? visibleFields(template).filter(
        f => template.dataset?.[f] === 'text' || template.dataset?.[f] === 'image',
      )
    : []
  const textFields = editFields.filter(f => isTextField(template!, f))
  const hasOverflow = template
    ? textFields.some(f => (texts[f] ?? '').length > maxLengthOf(template, f))
    : false

  // ── Generar texto de UN campo con IA ─────────────────────────────
  async function generateAiText(field: string) {
    if (!template || aiBusy) return
    const b = template.bindings?.[field]
    setAiBusy(field)
    try {
      const res = await fetch('/api/design/ai-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          fields: [{
            field,
            label: b?.label,
            purpose: b?.purpose,
            maxLength: b?.maxLength,
            instructions: b?.instructions,
          }],
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        toast.show(
          humanizeDesignError(data?.error, 'No se ha podido generar el texto. Inténtalo de nuevo.'),
          'info',
        )
        return
      }
      const value = data?.texts?.[field]
      if (typeof value === 'string' && value.trim() !== '') {
        setTexts(prev => ({ ...prev, [field]: value.trim() }))
        toast.show('Texto generado y colocado', 'success')
      } else {
        toast.show('No se ha podido generar el texto. Inténtalo de nuevo.', 'info')
      }
    } catch {
      toast.show('No se ha podido generar el texto. Comprueba tu conexión.', 'info')
    } finally {
      setAiBusy(null)
    }
  }

  // ── Subir foto de UN campo ───────────────────────────────────────
  async function handleImage(field: string, file: File) {
    if (!template || uploadBusy) return
    setUploadBusy(field)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', field)
      const res = await fetch('/api/design/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data?.error) {
        toast.show(data?.error ?? 'No se ha podido subir la foto. Inténtalo de nuevo.', 'info')
        return
      }
      const uploaded: UploadedPhoto = { path: data.path, signedUrl: data.signedUrl }
      setPhotos(prev => ({ ...prev, [field]: uploaded }))
      toast.show('Foto lista', 'success')
    } catch {
      toast.show('No se ha podido subir la foto. Comprueba tu conexión.', 'info')
    } finally {
      setUploadBusy(null)
    }
  }

  // ── Generar el diseño (textos + fotos actuales) ──────────────────
  async function handleGenerate() {
    if (!template || generating || hasOverflow) return
    setGenerating(true)
    try {
      const fillable = visibleFields(template)
      const cleanTexts: Record<string, string> = {}
      for (const f of fillable.filter(f => isTextField(template, f))) {
        const v = (texts[f] ?? '').trim()
        const behavior = template.bindings?.[f]?.behavior
        if (v && (behavior === 'user_text' || behavior === 'ai_text')) cleanTexts[f] = v
      }
      const cleanPhotos: Record<string, string> = {}
      for (const f of fillable.filter(f => !isTextField(template, f))) {
        const p = photos[f]
        if (p) cleanPhotos[f] = p.path
      }
      const res = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, texts: cleanTexts, photos: cleanPhotos }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        toast.show(
          humanizeDesignError(data?.error, 'No se ha podido generar tu diseño. Inténtalo de nuevo.'),
          'info',
        )
        return
      }
      // Páginas útiles: solo las que traen una url firmada real.
      const resultPages = (Array.isArray(data.pages) ? data.pages : []).filter(
        (p: { url?: unknown }) => p && typeof p.url === 'string' && p.url !== '',
      ) as GeneratedPage[]
      if (resultPages.length === 0) {
        toast.show('El diseño se generó pero no hay archivos disponibles. Prueba de nuevo.', 'info')
        return
      }
      setPages(resultPages)
      toast.show('Diseño listo para descargar', 'success')
    } catch {
      toast.show('No se ha podido generar tu diseño. Comprueba tu conexión.', 'info')
    } finally {
      setGenerating(false)
    }
  }

  // ── Descargar todas las páginas (secuencial, 300 ms) ────────────
  async function downloadAll(list: GeneratedPage[]) {
    if (downAll) return
    setDownAll(true)
    try {
      for (const p of list) {
        const a = document.createElement('a')
        a.href = p.url
        a.download = `diseno-pagina-${p.page}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        await new Promise(r => setTimeout(r, 300))
      }
    } finally {
      setDownAll(false)
    }
  }

  // ── Estados de carga / error ─────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="max-w-4xl space-y-5" aria-hidden>
        <div className="h-5 w-24 rounded bg-warm-gray animate-pulse" />
        <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 items-start">
          <div className="rounded-[var(--radius-md)] border border-soft bg-white animate-pulse overflow-hidden">
            <div className="bg-warm-gray" style={{ aspectRatio: '4 / 5' }} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[var(--radius-sm)] bg-white border border-soft animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (state === 'notfound') {
    return (
      <div className="max-w-4xl">
        <Card className="text-center py-10 px-6">
          <div className="flex justify-center mb-3">
            <span className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center bg-buttermilk">
              <LayoutTemplate size={24} className="text-cherry" />
            </span>
          </div>
          <p className="font-bold text-cherry-dark">Esta plantilla ya no está disponible</p>
          <p className="mt-1 text-sm text-cherry-dark opacity-70" style={{ lineHeight: 1.6 }}>
            Puede que el equipo la haya retirado o actualizado.
          </p>
          <div className="flex justify-center mt-4">
            <Link href="/disenos"><Button variant="secondary" size="sm">Ver otros diseños</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  if (state === 'error' || !template) {
    return (
      <div className="max-w-4xl">
        <Card className="text-center py-10 px-6">
          <div className="flex justify-center mb-3">
            <span className="w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center bg-buttermilk">
              <AlertTriangle size={24} className="text-cherry" />
            </span>
          </div>
          <p className="font-bold text-cherry-dark">No se ha podido cargar la plantilla</p>
          <p className="mt-1 text-sm text-cherry-dark opacity-70" style={{ lineHeight: 1.6 }}>
            Comprueba tu conexión y vuelve a intentarlo.
          </p>
          <div className="flex justify-center mt-4">
            <Button variant="secondary" size="sm" onClick={load}>Reintentar</Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Pantalla de la plantilla ─────────────────────────────────────
  const aspect = kindAspect(template.kind)

  return (
    <div className="max-w-4xl space-y-5">
      {/* Vuelta a la galería */}
      <Link
        href="/disenos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-cherry-dark opacity-70 hover:opacity-100 transition-opacity"
      >
        <ChevronLeft size={16} /> Diseños
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark leading-tight">{template.name}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge tone={template.kind === 'story' ? 'blue' : 'buttermilk'}>{kindLabel(template.kind)}</Badge>
          {template.pageCount > 1 && (
            <Badge tone="neutral">{template.pageCount} páginas</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 items-start">
        {/* IZQ — preview SIEMPRE a la vista (sticky en desktop) */}
        <div className="md:sticky md:top-8">
          <Card padding="none" className="overflow-hidden">
            <div className="bg-cream" style={{ aspectRatio: aspect }}>
              {template.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={template.previewUrl}
                  alt={`Vista previa de ${template.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <LayoutTemplate size={32} className="text-cherry opacity-30" />
                </div>
              )}
            </div>
            {template.pageCount > 1 && (
              <p className="px-4 py-2.5 text-xs text-cherry-dark opacity-60 border-t border-soft">
                Vista previa de página 1 · el diseño final tiene {template.pageCount} páginas
              </p>
            )}
          </Card>
        </div>

        {/* DER — campos o resultado */}
        {pages && pages.length > 0 ? (
          <ResultPanel
            pages={pages}
            aspect={aspect}
            downAll={downAll}
            onDownloadAll={() => downloadAll(pages)}
            onEditAgain={() => setPages(null)}
          />
        ) : (
          <FieldsPanel
            template={template}
            fields={editFields}
            texts={texts}
            photos={photos}
            aiBusy={aiBusy}
            uploadBusy={uploadBusy}
            hasOverflow={hasOverflow}
            generating={generating}
            onTextChange={(f, v) => setTexts(prev => ({ ...prev, [f]: v }))}
            onAiField={generateAiText}
            onFile={handleImage}
            onPickFile={f => fileRefs.current[f]?.click()}
            onGenerate={handleGenerate}
            registerFileInput={(f, el) => { fileRefs.current[f] = el }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Panel de campos ────────────────────────────────────────────────
function FieldsPanel({
  template, fields, texts, photos, aiBusy, uploadBusy, hasOverflow, generating,
  onTextChange, onAiField, onFile, onPickFile, onGenerate, registerFileInput,
}: {
  template: DesignTemplate
  fields: string[]
  texts: Record<string, string>
  photos: Record<string, UploadedPhoto>
  aiBusy: string | null
  uploadBusy: string | null
  hasOverflow: boolean
  generating: boolean
  onTextChange: (field: string, value: string) => void
  onAiField: (field: string) => void
  onFile: (field: string, file: File, reset: () => void) => void
  onPickFile: (field: string) => void
  onGenerate: () => void
  registerFileInput: (field: string, el: HTMLInputElement | null) => void
}) {
  const textFields = fields.filter(f => isTextField(template, f))

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink opacity-75">
        Rellena lo que quieras y pulsa Generar: el estilo ya está cuidado por tu equipo BRÄVE.
      </p>

      {fields.map(field => {
        const binding = template.bindings?.[field]
        const behavior = behaviorOf(template, field)
        if (isTextField(template, field)) {
          return (
            <TextFieldRow
              key={field}
              label={fieldLabel(field, binding)}
              behavior={behavior}
              value={texts[field] ?? ''}
              maxLength={maxLengthOf(template, field)}
              aiBusy={aiBusy === field}
              onChange={v => onTextChange(field, v)}
              onAiField={() => onAiField(field)}
            />
          )
        }
        return (
          <ImageFieldRow
            key={field}
            field={field}
            label={fieldLabel(field, binding)}
            purpose={binding?.purpose}
            photo={photos[field] ?? null}
            uploading={uploadBusy === field}
            onPickFile={() => onPickFile(field)}
            registerFileInput={el => registerFileInput(field, el)}
            onSelected={(file, reset) => onFile(field, file, reset)}
          />
        )
      })}

      <div className="space-y-2 pt-1">
        <Button
          size="lg"
          fullWidth
          loading={generating}
          disabled={hasOverflow}
          onClick={onGenerate}
        >
          {generating ? 'Generando… hasta un minuto' : 'Generar'}
        </Button>
        {hasOverflow && (
          <p className="text-xs text-danger">
            Hay textos demasiado largos (marcados en rojo). Acórtalos para continuar.
          </p>
        )}
        {textFields.length > 0 && !hasOverflow && (
          <p className="text-xs text-cherry-dark opacity-50">
            Los campos que dejes vacíos se completan con tu marca o los genera la IA.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Fila de texto según behavior ───────────────────────────────────
function TextFieldRow({
  label, behavior, value, maxLength, aiBusy, onChange, onAiField,
}: {
  label: string
  behavior: DesignBehavior
  value: string
  maxLength: number
  aiBusy: boolean
  onChange: (v: string) => void
  onAiField: () => void
}) {
  const remaining = maxLength - value.length
  const over = remaining < 0
  const isAi = behavior === 'ai_text'
  const isBrand = behavior === 'brand_text'

  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isBrand}
        className={over ? 'border-[var(--color-danger)]' : ''}
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {!isBrand && (
          <span className={`text-xs ${over ? 'text-danger font-semibold' : 'text-cherry-dark opacity-50'}`}>
            {over
              ? `Te has pasado por ${-remaining} caracteres`
              : `Quedan ${remaining} caracteres`}
          </span>
        )}
        {isAi && (
          <Button
            variant="ghost"
            size="sm"
            loading={aiBusy}
            icon={<Wand2 size={14} />}
            onClick={onAiField}
          >
            Generar con IA
          </Button>
        )}
        {isBrand && (
          <span className="text-xs text-cherry-dark opacity-50">Se llena con tu marca</span>
        )}
      </div>
    </div>
  )
}

// ─── Fila de imagen con subida + miniatura circular ─────────────────
function ImageFieldRow({
  field, label, purpose, photo, uploading, onPickFile, registerFileInput, onSelected,
}: {
  field: string
  label: string
  purpose?: string
  photo: UploadedPhoto | null
  uploading: boolean
  onPickFile: () => void
  registerFileInput: (el: HTMLInputElement | null) => void
  onSelected: (file: File, reset: () => void) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70">{label}</p>
      <div className="mt-1.5 flex items-center gap-3">
        {photo ? (
          // Miniatura circular con la foto ya subida (signedUrl del storage).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.signedUrl}
            alt={`Foto subida para ${label}`}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0 border border-soft"
          />
        ) : (
          <span className="w-14 h-14 rounded-full bg-cream border-[1.5px] border-soft flex items-center justify-center flex-shrink-0">
            <ImageIcon size={18} className="text-cherry opacity-40" />
          </span>
        )}
        <Button
          variant="secondary"
          size="sm"
          loading={uploading}
          icon={<Upload size={14} />}
          onClick={onPickFile}
        >
          {photo ? 'Cambiar foto' : 'Subir foto'}
        </Button>
      </div>
      {purpose && (
        <p className="mt-1.5 text-xs text-cherry-dark opacity-50">{purpose}</p>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={el => { registerFileInput(el) }}
        onChange={e => {
          const input = e.currentTarget
          const file = input.files?.[0]
          if (file) onSelected(file, () => { input.value = '' })
        }}
      />
    </div>
  )
}

// ─── Panel de resultado: una card por página ────────────────────────
function ResultPanel({
  pages, aspect, downAll, onDownloadAll, onEditAgain,
}: {
  pages: GeneratedPage[]
  aspect: string
  downAll: boolean
  onDownloadAll: () => void
  onEditAgain: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-cherry-dark">Diseño listo</h2>
        <p className="mt-0.5 text-sm text-cherry-dark opacity-60">
          Descárgalo y publícalo cuando quieras.
        </p>
      </div>

      <div className={pages.length > 1 ? 'grid sm:grid-cols-2 gap-4' : 'space-y-4'}>
        {pages.map(p => (
          <Card key={p.page} padding="none" className="overflow-hidden">
            <div className="bg-cream flex items-center justify-center" style={{ aspectRatio: aspect }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Página ${p.page} del diseño`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-cherry-dark opacity-60">
                Página {p.page}
              </span>
              <a
                href={p.url}
                download={`diseno-pagina-${p.page}.png`}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-[var(--radius-sm)] bg-buttermilk text-cherry-dark hover:opacity-90 transition-all"
              >
                <Download size={14} /> Descargar
              </a>
            </div>
          </Card>
        ))}
      </div>

      {pages.length > 1 && (
        <Button variant="secondary" fullWidth loading={downAll} onClick={onDownloadAll}>
          Descargar todas
        </Button>
      )}

      <p className="text-xs text-cherry-dark opacity-50" style={{ lineHeight: 1.6 }}>
        Los archivos están disponibles 24 h — si caducan, regenera el diseño.
      </p>

      <Button variant="ghost" fullWidth icon={<Pencil size={15} />} onClick={onEditAgain}>
        Editar de nuevo
      </Button>
    </div>
  )
}