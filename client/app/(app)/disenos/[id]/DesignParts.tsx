'use client'
import { Image as ImageIcon, Download, Pencil, Wand2, Upload } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DesignBehavior, GeneratedPage } from '@/lib/design'

/**
 * DISEÑOS · piezas compartidas del editor de plantilla:
 * filas de campo (texto/imagen) y panel de resultado.
 *
 * Las reutilizan el MODO FORMULARIO (layout clásico) y, las filas,
 * también el panel "Más ajustes" del MODO ZONAS — mismo input/contador/IA/subida.
 */

export interface UploadedPhoto {
  path: string
  signedUrl: string
}

// ─── Fila de texto según behavior ───────────────────────────────────
export function TextFieldRow({
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
export function ImageFieldRow({
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
// Lo reutilizan ambos modos (formulario y zonas): el resultado SIEMPRE
// reemplaza al editor, con Descargar por página + Descargar todas + nota 24h.
export function ResultPanel({
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