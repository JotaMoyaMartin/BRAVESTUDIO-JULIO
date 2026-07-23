'use client'
import { useRef, useState } from 'react'
import { Upload, X, Plus, Star, GripVertical } from 'lucide-react'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
}

const MAX = 10

export default function CarouselUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const addFiles = (files: FileList) => {
    setError(null)
    const valid: File[] = []
    Array.from(files).forEach(f => {
      if (!f.type.startsWith('image/')) return
      if (f.size > 3 * 1024 * 1024) {
        setError(`${f.name} supera 3MB`)
        return
      }
      valid.push(f)
    })
    if (valid.length === 0) return

    if (images.length + valid.length > MAX) {
      setError(`Máximo ${MAX} imágenes por carrusel`)
      return
    }

    Promise.all(valid.map(f => new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(f)
    }))).then(newUrls => {
      onChange([...images, ...newUrls])
    })
  }

  const removeAt = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx))
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const canAdd = images.length < MAX

  return (
    <div>
      {images.length > 0 ? (
        <>
          {/* Grid with all images — first one is the cover */}
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => {
              const isCover = i === 0
              const isDragOver = dragOverIdx === i && draggedIdx !== null && draggedIdx !== i
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setDraggedIdx(i)}
                  onDragOver={e => { e.preventDefault(); if (draggedIdx !== null && draggedIdx !== i) setDragOverIdx(i) }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={e => {
                    e.preventDefault()
                    if (draggedIdx !== null) reorder(draggedIdx, i)
                    setDraggedIdx(null)
                    setDragOverIdx(null)
                  }}
                  onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null) }}
                  className={`relative aspect-[4/5] rounded-lg overflow-hidden border-2 group cursor-grab active:cursor-grabbing transition-all ${
                    isCover ? 'border-[#7A1832] ring-2 ring-[#7A1832]/20' : 'border-[#FFF1B5]'
                  } ${isDragOver ? 'ring-2 ring-[#7A1832] ring-offset-2' : ''} ${draggedIdx === i ? 'opacity-40' : ''}`}
                >
                  <img src={img} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />

                  {/* Cover badge */}
                  {isCover && (
                    <div className="absolute top-1.5 left-1.5 bg-[#7A1832] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <Star size={9} fill="white" /> PORTADA
                    </div>
                  )}

                  {/* Position number */}
                  {!isCover && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                      {i + 1}
                    </div>
                  )}

                  {/* Drag handle */}
                  <div className="absolute top-1.5 right-1.5 bg-black/40 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={12} />
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAt(i) }}
                    className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}

            {/* Add cell */}
            {canAdd && (
              <button
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files) }}
                className={`aspect-[4/5] rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-[#8a8680] hover:text-[#7A1832] hover:border-[#7A1832]/60 hover:bg-[#FFF1B5]/30 transition-colors ${
                  dragOver ? 'border-[#7A1832] bg-[#FFF1B5]' : 'border-[#e8e6e3]'
                }`}
              >
                <Plus size={20} className="mb-1" />
                <span className="text-[10.5px] font-medium">Añadir</span>
              </button>
            )}
          </div>

          {/* Hints */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="text-[11px] text-[#8a8680] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7A1832]" /> Primera = portada · arrastra para reordenar
            </div>
            <div className="text-[11px] text-[#8a8680]">
              {images.length}/{MAX}
            </div>
          </div>
        </>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files) }}
          className={`w-full aspect-[4/5] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragOver ? 'border-[#7A1832] bg-[#FFF1B5]' : 'border-[#e8e6e3] bg-[#FFFDF5] hover:border-[#7A1832]/60 hover:bg-[#FFF1B5]/30'
          }`}
        >
          <Upload size={22} className="text-[#8a8680] mb-2" />
          <div className="text-[12px] text-[#7A1832] font-medium">Subir imágenes del carrusel</div>
          <div className="text-[10.5px] text-[#8a8680] mt-1">Arrastra varias o click para elegir</div>
          <div className="text-[10px] text-[#d0cecb] mt-1">Máximo {MAX} · máx 3MB cada una</div>
          <div className="text-[10px] text-[#d0cecb] mt-1">La primera será la portada</div>
        </div>
      )}

      {error && <div className="text-[11px] text-[#e03131] mt-1.5">{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}