'use client'
import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'

interface Props {
  value: string | null
  onChange: (dataUrl: string | null) => void
  aspect?: '4:5' | '1:1' | '4:3' | '9:16'
  label?: string
  compact?: boolean
}

const ASPECT_CLASS: Record<string, string> = {
  '4:5': 'aspect-[4/5]',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '9:16': 'aspect-[9/16]',
}

export default function ImageUploader({ value, onChange, aspect = '4:5', label = 'Portada', compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('El archivo no es una imagen')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La imagen supera 3MB. Usa una más pequeña.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  if (value) {
    return (
      <div className="relative group">
        <img src={value} alt={label} className={`w-full ${ASPECT_CLASS[aspect]} object-cover rounded-lg border border-[#FFF1B5]`} />
        {!compact && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              className="text-white text-[12px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md backdrop-blur-sm"
            >
              Cambiar
            </button>
            <button
              onClick={() => onChange(null)}
              className="text-white text-[12px] bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-md flex items-center gap-1"
            >
              <X size={13} /> Quitar
            </button>
          </div>
        )}
        {compact && (
          <button
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
          >
            <X size={12} />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`w-full ${ASPECT_CLASS[aspect]} rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragOver ? 'border-[#7A1832] bg-[#FFF1B5]' : 'border-[#e8e6e3] bg-[#FFFDF5] hover:border-[#7A1832]/60 hover:bg-[#FFF1B5]/30'
        }`}
      >
        <Upload size={20} className="text-[#8a8680] mb-1.5" />
        <div className="text-[11.5px] text-[#8a8680] text-center px-2">
          <span className="text-[#7A1832] font-medium">Subir {label.toLowerCase()}</span> o arrastrar
        </div>
        <div className="text-[10px] text-[#d0cecb] mt-1">JPG · PNG · máx 3MB</div>
      </div>
      {error && <div className="text-[11px] text-[#e03131] mt-1">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )
}