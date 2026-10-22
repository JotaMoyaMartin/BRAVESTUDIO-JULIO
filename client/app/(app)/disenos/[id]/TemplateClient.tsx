'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, PointerEvent as RPointerEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon,
  LayoutTemplate, Lock, SlidersHorizontal, Wand2, X,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  DesignTemplate, DesignBehavior, GeneratedPage, DesignBindingZone, PageZone, ZoneStyle,
  kindAspect, kindLabel, parseTemplate, behaviorOf, humanizeDesignError,
  fieldLabel, isTextField, maxLengthOf, visibleFields,
  previewPages, editorBgPages, templateHasZones, zonesOnPage,
} from '@/lib/design'
import { DEMO_TEMPLATES, DEMO_TEXTS, isDemoTemplate } from '@/lib/design-demo'
import { TextFieldRow, ImageFieldRow, ResultPanel, UploadedPhoto } from './DesignParts'

/**
 * DISEÑOS · PLANTILLA — DOS MODOS según la plantilla:
 *
 * MODO ZONAS (al menos un binding con zone calibrada):
 *   el preview es un lienzo interactivo SIEMPRE a la vista (sticky en
 *   desktop): la clienta toca recuadros del diseño para cambiar textos
 *   (editor inferior deslizante — el preview nunca se tapa) o subir foto
 *   (file picker directo con chip de estado sobre la zona).
 * MODO FORMULARIO (0 zonas): se mantiene EXACTO el layout de antes —
 *   preview a la IZQ (sticky) + campos a la DER — como fallback.
 *
 * Los campos con zona en OTRA página (o sin calibrar) aparecen además en el
 * panel compacto "Más ajustes": la clienta nunca pierde acceso por una
 * calibración a medias.
 *
 * Contratos:
 *  GET  /api/design/templates/[id]  → detalle con previewUrls + bindings[campo].zone
 *  POST /api/design/ai-texts        → fields: [un solo campo]
 *  POST /api/design/photo           → multipart file+field → { path, signedUrl }
 *  POST /api/design/generate        → { texts, photos } → pages (PNG firmadas 24h)
 */

interface Props {
  templateId: string
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

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

  // ── Estado del MODO ZONAS ────────────────────────────────────────
  const [pageIdx, setPageIdx] = useState(0)
  const [openText, setOpenText] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  // Modificaciones de posición/tamaño de zonas (drag + resize)
  const [zoneMods, setZoneMods] = useState<Record<string, { x?: number; y?: number; w?: number; h?: number }>>({})
  const updateZoneMod = useCallback((field: string, mod: { x?: number; y?: number; w?: number; h?: number }) => {
    setZoneMods(prev => ({
      ...prev,
      [field]: { ...prev[field], ...mod },
    }))
  }, [])

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── Carga de la plantilla ────────────────────────────────────────
  const isDemo = isDemoTemplate(templateId)

  const load = async () => {
    setState('loading')

    // Plantilla demo: cargar del array local, sin API
    if (isDemo) {
      const demo = DEMO_TEMPLATES.find(t => t.id === templateId)
      if (!demo) { setState('notfound'); return }
      setTemplate(demo)
      // Pre-fill text fields with defaultText from bindings
      const defaults: Record<string, string> = {}
      for (const [field, binding] of Object.entries(demo.bindings ?? {})) {
        if (binding.defaultText) defaults[field] = binding.defaultText
      }
      if (Object.keys(defaults).length > 0) setTexts(defaults)
      setPageIdx(0)
      setOpenText(null)
      setMoreOpen(false)
      setPages(null)
      setState('ready')
      return
    }

    try {
      const res = await fetch(`/api/design/templates/${templateId}`)
      if (res.status === 404) {
        setState('notfound')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      const parsed = parseTemplate((data as { template?: unknown })?.template ?? data)
      if (!parsed) {
        setState('notfound')
        return
      }
      setTemplate(parsed)
      // Pre-fill con el texto original del diseño (bindings[f].defaultText),
      // misma tolerancia que en las demos: string no vacío.
      const defaults: Record<string, string> = {}
      for (const [field, binding] of Object.entries(parsed.bindings ?? {})) {
        if (binding.defaultText) defaults[field] = binding.defaultText
      }
      if (Object.keys(defaults).length > 0) setTexts(defaults)
      setPageIdx(0)
      setOpenText(null)
      setMoreOpen(false)
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

  // Zonas de la página seleccionada (siempre 1-based frente a la API).
  const safePageIdx = template
    ? Math.min(pageIdx, Math.max(previewPages(template).length - 1, 0))
    : 0
  const pageZones = useMemo(
    () => (template && templateHasZones(template) ? zonesOnPage(template, safePageIdx + 1) : []),
    [template, safePageIdx],
  )

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

  // ── Generar TODOS los textos IA de una vez ───────────────────────
  const [allAiBusy, setAllAiBusy] = useState(false)

  async function generateAllAiTexts() {
    if (!template || allAiBusy) return
    setAllAiBusy(true)

    const aiFields = visibleFields(template).filter(
      f => isTextField(template, f) && behaviorOf(template, f) === 'ai_text',
    )
    if (aiFields.length === 0) {
      toast.show('No hay campos de IA en esta plantilla', 'info')
      setAllAiBusy(false)
      return
    }

    // Demo: usar textos de ejemplo locales, sin API
    if (isDemo) {
      const demoTexts = DEMO_TEXTS[template.id] || {}
      const newTexts: Record<string, string> = {}
      for (const f of aiFields) {
        if (demoTexts[f]) newTexts[f] = demoTexts[f]
      }
      // Simular delay para que se vea el loading
      await new Promise(r => setTimeout(r, 1_200))
      setTexts(prev => ({ ...prev, ...newTexts }))
      toast.show(`${Object.keys(newTexts).length} textos generados`, 'success')
      setAllAiBusy(false)
      return
    }

    // Real: llamar a la API para todos los campos ai_text
    try {
      const res = await fetch('/api/design/ai-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          fields: aiFields.map(f => {
            const b = template.bindings?.[f]
            return {
              field: f,
              label: b?.label,
              purpose: b?.purpose,
              maxLength: b?.maxLength,
              instructions: b?.instructions,
            }
          }),
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        toast.show(
          humanizeDesignError(data?.error, 'No se han podido generar los textos.'),
          'info',
        )
        return
      }
      const generated = data?.texts ?? {}
      const filled: Record<string, string> = {}
      for (const f of aiFields) {
        const v = generated[f]
        if (typeof v === 'string' && v.trim() !== '') filled[f] = v.trim()
      }
      setTexts(prev => ({ ...prev, ...filled }))
      toast.show(`${Object.keys(filled).length} textos generados con IA`, 'success')
    } catch {
      toast.show('No se han podido generar los textos. Comprueba tu conexión.', 'info')
    } finally {
      setAllAiBusy(false)
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
    if (!template || generating) return
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
      setOpenText(null)
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

  // ── La plantilla está lista: elegir modo ─────────────────────────
  const zonesMode = templateHasZones(template)
  const aspect = kindAspect(template.kind, template)

  const editFields = visibleFields(template).filter(
    f => template.dataset?.[f] === 'text' || template.dataset?.[f] === 'image',
  )
  const textFields = editFields.filter(f => isTextField(template, f))
  const hasOverflow = textFields.some(f => (texts[f] ?? '').length > maxLengthOf(template, f))

  // Campos SIN zona en la página actual → "Más ajustes" (nunca se pierde acceso).
  const extraFields = zonesMode
    ? editFields.filter(f => !pageZones.some(z => z.field === f))
    : []

  // Campo abierto en el editor inferior (solo campos de texto).
  const panelField = zonesMode && openText
    ? (behaviorOf(template, openText) === 'user_text' || behaviorOf(template, openText) === 'ai_text'
        ? openText
        : null)
    : null
  const panelBinding = panelField ? template.bindings?.[panelField] : undefined
  const pagePreviews = previewPages(template)
  const editorBgs = editorBgPages(template)

  if (!zonesMode) {
    // ── MODO FORMULARIO: layout clásico intacto ──────────────────────
    return (
      <div className="max-w-4xl space-y-5">
        <Link
          href="/disenos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cherry-dark opacity-70 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={16} /> Diseños
        </Link>

        <TemplateHeader template={template} onGenerateAll={generateAllAiTexts} allBusy={allAiBusy} isDemo={isDemo} />

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

  // ── MODO ZONAS: el preview es el lienzo interactivo ──────────────
  return (
    <div className="max-w-xl md:max-w-2xl space-y-4">
      <Link
        href="/disenos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-cherry-dark opacity-70 hover:opacity-100 transition-opacity"
      >
        <ChevronLeft size={16} /> Diseños
      </Link>

      <TemplateHeader template={template} />

      {pages && pages.length > 0 ? (
        /* RESULTADO: reemplaza el lienzo (mismo ResultPanel que el modo formulario) */
        <ResultPanel
          pages={pages}
          aspect={aspect}
          downAll={downAll}
          onDownloadAll={() => downloadAll(pages)}
          onEditAgain={() => setPages(null)}
        />
      ) : (
        <>
          <p className="text-sm text-ink opacity-75">
            Toca los recuadros del diseño para cambiar textos o subir tu foto.
          </p>

          {/* Lienzo interactivo */}
          <div>
            <Card padding="none" className="overflow-hidden">
              <DesignCanvas
                template={template}
                pageUrl={editorBgs[safePageIdx] ?? pagePreviews[safePageIdx] ?? template.previewUrl}
                pageNum={safePageIdx + 1}
                aspect={aspect}
                zones={pageZones}
                texts={texts}
                photos={photos}
                aiBusy={aiBusy}
                uploadBusy={uploadBusy}
                openField={openText}
                zoneMods={zoneMods}
                onZoneMod={updateZoneMod}
                onOpenText={setOpenText}
                onPickPhoto={f => fileRefs.current[f]?.click()}
                onTapLocked={behavior => toast.show(
                  behavior === 'brand_text'
                    ? 'Este texto se llena con los datos de tu marca'
                    : 'Este elemento es fijo en la plantilla',
                  'info',
                )}
              />
            </Card>

            {template.pageCount > 1 && (
              <p className="mt-2 px-1 text-center text-xs text-cherry-dark opacity-60">
                El diseño final tiene {template.pageCount} páginas
              </p>
            )}

            {/* Selector de página (solo con varias páginas firmadas) */}
            {template.previewUrls && template.previewUrls.length > 1 && (
              <PagePager
                previews={pagePreviews}
                current={safePageIdx}
                onGo={setPageIdx}
              />
            )}
          </div>

          {/* Campos sin zona en ESTA página — mismo input/contador/IA/subida */}
          {extraFields.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-soft bg-white">
              <button
                type="button"
                onClick={() => setMoreOpen(v => !v)}
                aria-expanded={moreOpen}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-cherry-dark">
                  <SlidersHorizontal size={16} />
                  Más ajustes
                  <Badge tone="neutral">{extraFields.length}</Badge>
                </span>
                <ChevronDown
                  size={16}
                  className={`text-cherry-dark opacity-50 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {moreOpen && (
                <div className="border-t border-soft p-4 space-y-5">
                  {extraFields.map(field => {
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
                          onChange={v => setTexts(prev => ({ ...prev, [field]: v }))}
                          onAiField={() => generateAiText(field)}
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
                        onPickFile={() => fileRefs.current[field]?.click()}
                        registerFileInput={el => { fileRefs.current[field] = el }}
                        onSelected={file => handleImage(field, file)}
                      />
                    )
                  })}
                  <p className="text-xs text-cherry-dark opacity-50">
                    Estos campos no están marcados en la página que ves — ajústalos aquí igualmente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Generar — debajo del canvas (no sticky para no tapar zonas del diseño) */}
          <div>
            <div className="rounded-[var(--radius-md)] border border-soft bg-white p-3 shadow-strong">
              <Button
                size="lg"
                fullWidth
                loading={generating}
                disabled={hasOverflow || isDemo}
                onClick={handleGenerate}
              >
                {isDemo ? 'Genera con tus plantillas reales' : generating ? 'Generando… hasta un minuto' : 'Crear mi diseño'}
              </Button>
              {isDemo && (
                <p className="mt-2 text-xs text-cherry-dark opacity-55">
                  Esta es una plantilla de ejemplo. Cuando el equipo publique las tuyas desde Canva, podrás generar diseños finales.
                </p>
              )}
              {hasOverflow && (
                <p className="mt-2 text-xs text-danger">
                  Hay textos demasiado largos (marcados en rojo). Acórtalos para continuar.
                </p>
              )}
            </div>
          </div>

          {/* File inputs ocultos de las zonas de foto de ESTA página */}
          {pageZones.filter(z => z.behavior === 'user_image').map(z => (
            <input
              key={`zone-file-${z.field}`}
              type="file"
              accept="image/*"
              className="hidden"
              ref={el => { fileRefs.current[z.field] = el }}
              onChange={e => {
                const input = e.currentTarget
                const file = input.files?.[0]
                if (file) handleImage(z.field, file)
              }}
            />
          ))}
        </>
      )}

      {/* Editor inferior — panel deslizante que nunca tapa el preview.
          Móvil: sheet a ancho completo; desktop: popover flotante centrado. */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
        <AnimatePresence>
          {panelField && (
            <motion.div
              key={panelField}
              initial={{ y: 64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 64, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="dialog"
              aria-label={`Editar ${fieldLabel(panelField, panelBinding)}`}
              className="pointer-events-auto w-full md:w-[26rem] md:mb-6 rounded-t-[var(--radius-lg)] md:rounded-[var(--radius-md)] border border-soft bg-white shadow-strong p-4"
            >
              <TextEditorSheet
                label={fieldLabel(panelField, panelBinding)}
                value={texts[panelField] ?? ''}
                maxLength={maxLengthOf(template, panelField)}
                isAi={behaviorOf(template, panelField) === 'ai_text'}
                busy={aiBusy === panelField}
                onChange={v => setTexts(prev => ({ ...prev, [panelField]: v }))}
                onAi={() => generateAiText(panelField)}
                onClose={() => setOpenText(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Cabecera común a los dos modos ─────────────────────────────────
function TemplateHeader({
  template, onGenerateAll, allBusy, isDemo,
}: {
  template: DesignTemplate
  onGenerateAll?: () => void
  allBusy?: boolean
  isDemo?: boolean
}) {
  const hasAiFields = visibleFields(template).some(
    f => isTextField(template, f) && behaviorOf(template, f) === 'ai_text',
  )
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-cherry-dark leading-tight">{template.name}</h1>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Badge tone={template.kind === 'story' ? 'blue' : 'buttermilk'}>{kindLabel(template.kind)}</Badge>
        {template.pageCount > 1 && (
          <Badge tone="neutral">{template.pageCount} páginas</Badge>
        )}
        {isDemo && <Badge tone="neutral">Ejemplo</Badge>}
      </div>
      {hasAiFields && onGenerateAll && (
        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            loading={allBusy}
            icon={<Wand2 size={14} />}
            onClick={onGenerateAll}
          >
            Generar todos los textos con IA
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Lienzo: página del preview + overlays de zona (drag + resize) ──
function DesignCanvas({
  template, pageUrl, pageNum, aspect, zones, texts, photos, aiBusy, uploadBusy,
  openField, zoneMods, onZoneMod, onOpenText, onPickPhoto, onTapLocked,
}: {
  template: DesignTemplate
  pageUrl: string | null
  pageNum: number
  aspect: string
  zones: PageZone[]
  texts: Record<string, string>
  photos: Record<string, UploadedPhoto>
  aiBusy: string | null
  uploadBusy: string | null
  openField: string | null
  zoneMods: Record<string, { x?: number; y?: number; w?: number; h?: number }>
  onZoneMod: (field: string, mod: { x?: number; y?: number; w?: number; h?: number }) => void
  onOpenText: (field: string) => void
  onPickPhoto: (field: string) => void
  onTapLocked: (behavior: DesignBehavior) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Merge zone with user modifications
  function mergedZone(z: PageZone): DesignBindingZone {
    const mod = zoneMods[z.field]
    if (!mod) return z.zone
    return {
      ...z.zone,
      x: mod.x ?? z.zone.x,
      y: mod.y ?? z.zone.y,
      w: mod.w ?? z.zone.w,
      h: mod.h ?? z.zone.h,
    }
  }

  return (
    <div ref={containerRef} className="relative bg-cream select-none" style={{ aspectRatio: aspect, containerType: 'inline-size' }}>
      {pageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pageUrl}
          alt={`Vista previa · página ${pageNum} de ${template.name}`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <LayoutTemplate size={32} className="text-cherry opacity-30" />
        </div>
      )}

      {/* Photo layers: always render default photos as full-canvas overlays.
          When user uploads, the zone shows their photo ON TOP of this layer,
          but the frame borders remain visible around the zone edges. */}
      {zones
        .filter(z => z.behavior === 'user_image' && template.bindings?.[z.field]?.defaultPhotoUrl)
        .map(z => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`layer-${z.field}`}
            src={template.bindings[z.field].defaultPhotoUrl!}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ))
      }

      {zones.map(z => {
        const binding = template.bindings?.[z.field]
        const zone = mergedZone(z)
        if (z.behavior === 'user_image') {
          return (
            <DraggableZone
              key={z.field}
              field={z.field}
              zone={zone}
              containerRef={containerRef}
              onMod={onZoneMod}
            >
              <PhotoZoneContent
                label={fieldLabel(z.field, binding)}
                photo={photos[z.field] ?? null}
                defaultPhotoUrl={binding?.defaultPhotoUrl}
                uploading={uploadBusy === z.field}
                onPick={() => onPickPhoto(z.field)}
              />
            </DraggableZone>
          )
        }
        if (z.behavior === 'user_text' || z.behavior === 'ai_text') {
          return (
            <DraggableZone
              key={z.field}
              field={z.field}
              zone={zone}
              containerRef={containerRef}
              onMod={onZoneMod}
            >
              <TextZoneContent
                label={fieldLabel(z.field, binding)}
                value={texts[z.field] ?? ''}
                maxLength={maxLengthOf(template, z.field)}
                busy={aiBusy === z.field}
                active={openField === z.field}
                onOpen={() => onOpenText(z.field)}
                zoneStyle={binding?.zoneStyle}
              />
            </DraggableZone>
          )
        }
        return (
          <DraggableZone
            key={z.field}
            field={z.field}
            zone={zone}
            containerRef={containerRef}
            onMod={onZoneMod}
          >
            <LockedZoneContent
              behavior={z.behavior}
              onTap={() => onTapLocked(z.behavior)}
            />
          </DraggableZone>
        )
      })}
    </div>
  )
}

// ─── Wrapper draggable + resizable para cualquier zona ──────────────
type DragMode = null | 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl'

function DraggableZone({
  field, zone, containerRef, onMod, children,
}: {
  field: string
  zone: DesignBindingZone
  containerRef: React.RefObject<HTMLDivElement | null>
  onMod: (field: string, mod: { x?: number; y?: number; w?: number; h?: number }) => void
  children: ReactNode
}) {
  const dragRef = useRef<{
    mode: DragMode
    startPx: { x: number; y: number }
    startZone: { x: number; y: number; w: number; h: number }
    dragging: boolean  // true once moved past threshold
  } | null>(null)

  const DRAG_THRESHOLD = 4 // px antes de considerar que es drag (no click)

  const pointerIdRef = useRef<number | null>(null)

  const handlePointerDown = useCallback((e: RPointerEvent, mode: DragMode) => {
    if (!mode) return
    if (mode !== 'move') {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    pointerIdRef.current = e.pointerId
    dragRef.current = {
      mode,
      startPx: { x: e.clientX, y: e.clientY },
      startZone: { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
      dragging: mode !== 'move',
    }
  }, [zone])

  const handlePointerMove = useCallback((e: RPointerEvent) => {
    const d = dragRef.current
    if (!d || !containerRef.current) return

    // Move mode: esperar threshold antes de empezar drag
    if (!d.dragging) {
      const dx = Math.abs(e.clientX - d.startPx.x)
      const dy = Math.abs(e.clientY - d.startPx.y)
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return
      // Ahora sí es drag — capturar pointer y prevenir default
      d.dragging = true
      if (pointerIdRef.current !== null) {
        try { (e.currentTarget as HTMLElement).setPointerCapture(pointerIdRef.current) } catch {}
      }
    }
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const dxPct = ((e.clientX - d.startPx.x) / rect.width) * 100
    const dyPct = ((e.clientY - d.startPx.y) / rect.height) * 100

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

    if (d.mode === 'move') {
      const nx = clamp(d.startZone.x + dxPct, 0, 100 - d.startZone.w)
      const ny = clamp(d.startZone.y + dyPct, 0, 100 - d.startZone.h)
      onMod(field, { x: nx, y: ny, w: d.startZone.w, h: d.startZone.h })
    } else if (d.mode === 'resize-br') {
      const nw = clamp(d.startZone.w + dxPct, 8, 100 - d.startZone.x)
      const nh = clamp(d.startZone.h + dyPct, 5, 100 - d.startZone.y)
      onMod(field, { w: nw, h: nh })
    } else if (d.mode === 'resize-bl') {
      const rawX = d.startZone.x + dxPct
      const rawW = d.startZone.w - dxPct
      const nw = clamp(rawW, 8, d.startZone.x + d.startZone.w)
      const nx = d.startZone.x + d.startZone.w - nw
      const nh = clamp(d.startZone.h + dyPct, 5, 100 - d.startZone.y)
      onMod(field, { x: nx, w: nw, h: nh })
    } else if (d.mode === 'resize-tr') {
      const nw = clamp(d.startZone.w + dxPct, 8, 100 - d.startZone.x)
      const rawH = d.startZone.h - dyPct
      const nh = clamp(rawH, 5, d.startZone.y + d.startZone.h)
      const ny = d.startZone.y + d.startZone.h - nh
      onMod(field, { y: ny, w: nw, h: nh })
    } else if (d.mode === 'resize-tl') {
      const rawW = d.startZone.w - dxPct
      const nw = clamp(rawW, 8, d.startZone.x + d.startZone.w)
      const nx = d.startZone.x + d.startZone.w - nw
      const rawH = d.startZone.h - dyPct
      const nh = clamp(rawH, 5, d.startZone.y + d.startZone.h)
      const ny = d.startZone.y + d.startZone.h - nh
      onMod(field, { x: nx, y: ny, w: nw, h: nh })
    }
  }, [containerRef, field, onMod])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const handleSize = 10

  return (
    <div
      className="absolute group"
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.w}%`,
        height: `${zone.h}%`,
        touchAction: 'none',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Move handle: the body — pointer down for drag, clicks pass through to children */}
      <div
        className="absolute inset-0"
        style={{ cursor: 'grab' }}
        onPointerDown={e => handlePointerDown(e, 'move')}
      >
        {children}
      </div>

      {/* Resize handles: 4 corners */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(corner => {
        const pos = {
          tl: { top: -handleSize / 2, left: -handleSize / 2, cursor: 'nwse-resize' },
          tr: { top: -handleSize / 2, right: -handleSize / 2, cursor: 'nesw-resize' },
          bl: { bottom: -handleSize / 2, left: -handleSize / 2, cursor: 'nesw-resize' },
          br: { bottom: -handleSize / 2, right: -handleSize / 2, cursor: 'nwse-resize' },
        }[corner]
        return (
          <div
            key={corner}
            className="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              width: handleSize,
              height: handleSize,
              borderRadius: '50%',
              background: 'var(--color-cherry)',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              ...pos,
            }}
            onPointerDown={e => handlePointerDown(e, `resize-${corner}`)}
          />
        )
      })}
    </div>
  )
}

// ─── Selector de página: puntos + aristas + miniaturas 40px ─────────
function PagePager({
  previews, current, onGo,
}: {
  previews: string[]
  current: number
  onGo: (index: number) => void
}) {
  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onGo(current - 1)}
          disabled={current === 0}
          aria-label="Página anterior"
          className="w-9 h-9 flex-shrink-0 rounded-full border border-soft bg-white flex items-center justify-center text-cherry-dark transition-all disabled:opacity-30 hover:bg-warm-light"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {previews.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Ir a la página ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
              className={`h-2.5 rounded-full transition-all ${i === current ? 'w-6 bg-cherry' : 'w-2.5 bg-cherry opacity-25 hover:opacity-60'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onGo(current + 1)}
          disabled={current === previews.length - 1}
          aria-label="Página siguiente"
          className="w-9 h-9 flex-shrink-0 rounded-full border border-soft bg-white flex items-center justify-center text-cherry-dark transition-all disabled:opacity-30 hover:bg-warm-light"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {previews.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onGo(i)}
            aria-label={`Página ${i + 1}`}
            aria-current={i === current ? 'true' : undefined}
            title={`Página ${i + 1}`}
            className={`w-10 h-10 flex-shrink-0 rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all ${i === current ? 'border-cherry' : 'border-soft opacity-60 hover:opacity-100'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <p className="text-xs text-center text-cherry-dark opacity-60">
        Página {current + 1} de {previews.length}
      </p>
    </div>
  )
}

// ─── Chip de estado sobre las zonas ─────────────────────────────────
function ZoneChip({ tone, children }: { tone: 'cream' | 'ok' | 'danger'; children: ReactNode }) {
  const tones = {
    cream: 'bg-cream text-cherry-dark shadow-soft',
    ok: 'bg-pastel-green text-ink',
    danger: 'bg-[var(--color-danger)] text-white',
  }
  return (
    <span className={`pointer-events-none inline-flex items-center gap-1 max-w-full rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none truncate ${tones[tone]}`}>
      {children}
    </span>
  )
}

function ZoneSpinner() {
  return (
    <span className="inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
  )
}

// ─── Contenido de zona de TEXTO (sin posicionamiento — DraggableZone lo maneja)
function TextZoneContent({
  label, value, maxLength, busy, active, onOpen, zoneStyle,
}: {
  label: string
  value: string
  maxLength: number
  busy: boolean
  active: boolean
  onOpen: () => void
  zoneStyle?: ZoneStyle
}) {
  const over = value.length > maxLength
  const changed = value.trim() !== ''

  // ── Modo estilizado: renderiza el texto real como en el diseño Canva ──
  if (zoneStyle) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        aria-label={`Editar ${label}`}
        title={`Toca para editar: ${label}`}
        className={`w-full h-full cursor-text overflow-hidden ${busy ? 'cursor-progress' : ''}`}
        style={{
          fontFamily: zoneStyle.fontFamily,
          fontSize: zoneStyle.fontSize,
          color: zoneStyle.color,
          background: zoneStyle.bg ?? 'transparent',
          fontWeight: zoneStyle.fontWeight ?? '400',
          fontStyle: zoneStyle.fontStyle ?? 'normal',
          textAlign: zoneStyle.textAlign ?? 'start',
          letterSpacing: zoneStyle.letterSpacing ?? 'normal',
          lineHeight: zoneStyle.lineHeight ?? 1.2,
          outline: active ? '2px solid rgba(122,24,50,0.6)' : 'none',
          outlineOffset: '2px',
          transition: 'outline 0.15s',
        }}
      >
        {/* Highlight sutil al hover */}
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity pointer-events-none opacity-0 group-hover:opacity-100"
          style={{ boxShadow: 'inset 0 0 0 2px rgba(122,24,50,0.35)', borderRadius: '3px' }}
        />
        {/* Texto real */}
        <span className="pointer-events-none whitespace-pre-wrap">
          {busy ? '⏳ Generando…' : (value || label)}
        </span>
        {/* Badge de estado (esquina) */}
        {!busy && changed && (
          <span className="absolute top-0 right-0 pointer-events-none">
            <ZoneChip tone="ok"><Check size={9} /></ZoneChip>
          </span>
        )}
      </div>
    )
  }

  // ── Modo chip: zonas sin estilo (demo genéricas) ──
  return (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={onOpen}
      onClick={onOpen}
      aria-label={`Editar ${label}`}
      title={`${label} — arrastra para mover, esquinas para redimensionar`}
      className={`w-full h-full flex items-start p-0.5 rounded-[6px] ${busy ? 'cursor-progress' : ''}`}
      style={{
        border: `2px dashed ${over ? 'var(--color-danger)' : 'var(--color-cherry)'}`,
      }}
    >
      <span
        aria-hidden
        className={`absolute inset-0 rounded-[6px] transition-opacity pointer-events-none ${active || busy ? 'opacity-40' : 'opacity-0 group-hover:opacity-40'}`}
        style={{ background: 'var(--color-buttermilk)' }}
      />
      <span className="relative max-w-full pointer-events-none">
        {busy ? (
          <ZoneChip tone="cream"><ZoneSpinner /> Generando…</ZoneChip>
        ) : over ? (
          <ZoneChip tone="danger">Demasiado largo</ZoneChip>
        ) : changed ? (
          <ZoneChip tone="ok"><Check size={11} /> Cambiado</ZoneChip>
        ) : (
          <ZoneChip tone="cream">Toca para escribir</ZoneChip>
        )}
      </span>
    </div>
  )
}

// ─── Contenido de zona de FOTO ─────────────────────────────────────
function PhotoZoneContent({
  label, photo, defaultPhotoUrl, uploading, onPick,
}: {
  label: string
  photo: UploadedPhoto | null
  defaultPhotoUrl?: string
  uploading: boolean
  onPick: () => void
}) {
  const hasUserPhoto = !!photo

  // Foto del usuario subida → mostrarla dentro de la zona
  if (hasUserPhoto) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onPick}
        aria-label={`Cambiar foto de ${label}`}
        title={`${label} — toca para cambiar la foto`}
        className="w-full h-full cursor-pointer relative"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.signedUrl}
          alt={label}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
        />
        {/* Hover overlay */}
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity pointer-events-none opacity-0 group-hover:opacity-100 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '3px' }}
        >
          <span className="bg-white/90 rounded-full px-2.5 py-1 text-[11px] font-semibold text-cherry-dark inline-flex items-center gap-1">
            <ImageIcon size={12} /> Cambiar foto
          </span>
        </span>
        {uploading && (
          <span className="absolute top-1 right-1 pointer-events-none">
            <ZoneChip tone="cream"><ZoneSpinner /> Subiendo…</ZoneChip>
          </span>
        )}
        {!uploading && (
          <span className="absolute top-1 right-1 pointer-events-none">
            <ZoneChip tone="ok"><Check size={9} /></ZoneChip>
          </span>
        )}
      </div>
    )
  }

  // Foto por defecto de Canva (renderizada como capa en el canvas) → zona transparente de click
  if (defaultPhotoUrl) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onPick}
        aria-label={`Toca para cambiar: ${label}`}
        title={`${label} — toca para cambiar la foto`}
        className="w-full h-full cursor-pointer relative"
      >
        {/* Hover overlay sobre la foto por defecto */}
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity pointer-events-none opacity-0 group-hover:opacity-100 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '3px' }}
        >
          <span className="bg-white/90 rounded-full px-2.5 py-1 text-[11px] font-semibold text-cherry-dark inline-flex items-center gap-1">
            <ImageIcon size={12} /> Cambiar foto
          </span>
        </span>
        {uploading && (
          <span className="absolute top-1 right-1 pointer-events-none">
            <ZoneChip tone="cream"><ZoneSpinner /> Subiendo…</ZoneChip>
          </span>
        )}
      </div>
    )
  }

  // Sin foto por defecto ni subida → chip original
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      aria-label={`Subir foto de ${label}`}
      title={`${label} — arrastra para mover, esquinas para redimensionar`}
      className="w-full h-full flex items-start p-0.5 rounded-[6px]"
      style={{ border: '2px dashed var(--color-pastel-blue)' }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[6px] transition-opacity pointer-events-none opacity-0 group-hover:opacity-40"
        style={{ background: 'var(--color-buttermilk)' }}
      />
      <span className="relative max-w-full pointer-events-none">
        {uploading ? (
          <ZoneChip tone="cream"><ZoneSpinner /> Subiendo…</ZoneChip>
        ) : (
          <ZoneChip tone="cream"><ImageIcon size={10} /> Toca para foto</ZoneChip>
        )}
      </span>
    </div>
  )
}

// ─── Contenido de zona bloqueada ───────────────────────────────────
function LockedZoneContent({
  behavior, onTap,
}: {
  behavior: DesignBehavior
  onTap: () => void
}) {
  const isBrand = behavior === 'brand_text'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      aria-label={isBrand ? 'Se llena con los datos de tu marca' : 'Elemento fijo de la plantilla'}
      title={isBrand ? 'Se llena con tus datos de marca' : 'Esta zona es fija en la plantilla'}
      className="w-full h-full flex items-start p-0.5"
    >
      <span className="pointer-events-none">
        <ZoneChip tone="cream">
          <Lock size={10} /> {isBrand ? 'Tu marca' : 'Fijo'}
        </ZoneChip>
      </span>
    </div>
  )
}

// ─── Editor inferior de texto (panel deslizante) ────────────────────
function TextEditorSheet({
  label, value, maxLength, isAi, busy, onChange, onAi, onClose,
}: {
  label: string
  value: string
  maxLength: number
  isAi: boolean
  busy: boolean
  onChange: (v: string) => void
  onAi: () => void
  onClose: () => void
}) {
  const remaining = maxLength - value.length
  const over = remaining < 0
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-cherry-dark opacity-70 truncate">
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar editor"
          className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-cherry-dark hover:bg-warm-gray transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus
        className={over ? 'border-[var(--color-danger)]' : ''}
      />

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${over ? 'text-danger font-semibold' : 'text-cherry-dark opacity-50'}`}>
          {over
            ? `Te has pasado por ${-remaining} caracteres`
            : `Quedan ${remaining} caracteres`}
        </span>
        {isAi && (
          <Button
            variant="ghost"
            size="sm"
            loading={busy}
            icon={<Wand2 size={14} />}
            onClick={onAi}
          >
            Generar con IA
          </Button>
        )}
      </div>

      <Button size="md" fullWidth disabled={over} onClick={onClose}>
        Listo
      </Button>
    </div>
  )
}

// ─── Panel de campos (MODO FORMULARIO) — intacto como fallback ──────
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