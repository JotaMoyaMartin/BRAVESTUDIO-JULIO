import { getDesignDataset } from './designs'
import { createAutofillFromDesign, awaitAutofillDesign, AutofillDataValue } from './autofill'
import { createPngExport, awaitExportUrls } from './exports'
import { CanvaDataset, CanvaError } from './types'

/**
 * Orquestador del flujo completo de generación (spike Canva):
 *
 *   validar dataset → subir fotos como assets → autofill (create_from_design)
 *   → poll → export PNG → poll → descargar páginas
 *
 * Todo server-side; devuelve los buffers PNG que la ruta guarda en Storage.
 * Timeout total acotado (sin polling agresivo): fotos ~60s + autofill ~90s
 * + export ~150s = peyorativo < 5 min, típico < 40s.
 */

export interface GenerationPhotoInput {
  field: string
  /** URL accesible por internet (signed URL de Storage) válida ≥ 1h. */
  url: string
  name?: string
}

export interface GenerationInput {
  texts: Record<string, string>
  photos: GenerationPhotoInput[]
}

/**
 * Lanza el autofill completo de create_from_design y devuelve el design
 * nuevo + los PNG de cada página descargados (orden de página).
 */
export async function runDesignGeneration(args: {
  accessToken: string
  designId: string
  input: GenerationInput
  title?: string
}): Promise<{
  designId: string
  pages: { page: number; buffer: Buffer }[]
  usesRemaining: number | null
}> {
  const { accessToken, designId, input } = args

  // 1) Validación contra el dataset ACTUAL de Canva (los campos cambian/renombrarse).
  const dataset: CanvaDataset = await getDesignDataset({ accessToken, designId })
  if (Object.keys(dataset).length === 0) {
    throw new CanvaError(422, 'design_not_fillable', 'El diseño no tiene campos de Data Autofill.')
  }
  const allFields = [...Object.keys(input.texts), ...input.photos.map(p => p.field)]
  for (const field of allFields) {
    const type = dataset[field]
    if (!type) {
      throw new CanvaError(400, 'field_mismatch', `El campo "${field}" ya no existe en el diseño de Canva — esta plantilla necesita sincronizarse.`)
    }
    if (input.texts[field] && type !== 'text') {
      throw new CanvaError(400, 'type_mismatch', `El campo "${field}" es ${type}, no texto.`)
    }
  }
  for (const photo of input.photos) {
    if (dataset[photo.field] !== 'image') {
      throw new CanvaError(400, 'type_mismatch', `El campo "${photo.field}" no acepta imagen (tipo: ${dataset[photo.field] ?? 'desconocido'}).`)
    }
  }

  // 2) Fotos → assets de Canva (los campos imagen del autofill exigen asset_id).
  const data: Record<string, AutofillDataValue> = {}
  for (const [field, text] of Object.entries(input.texts)) {
    if (dataset[field] === 'text') data[field] = { type: 'text', text }
  }
  for (const photo of input.photos) {
    const { createUrlAssetUpload, awaitAssetId } = await import('./assets')
    const up = await createUrlAssetUpload({
      accessToken,
      name: photo.name || `brave-${photo.field}-${Date.now().toString(36)}`,
      url: photo.url,
    })
    const assetId = await awaitAssetId({ accessToken, jobId: up.jobId })
    data[photo.field] = { type: 'image', asset_id: assetId }
  }

  // 3) Autofill — create_from_design: el master queda intacto.
  const { createAutofillFromDesign } = await import('./autofill')
  const autofill = await createAutofillFromDesign({
    accessToken,
    designId,
    data,
    title: args.title,
  })
  const { design: generated, usesRemaining } = await awaitAutofillDesign({
    accessToken,
    jobId: autofill.jobId,
  })

  // 4) Export PNG del design generado (una URL por página) → descargar.
  const { createPngExport } = await import('./exports')
  const exportJob = await createPngExport({ accessToken, designId: generated.id })
  const urls = await awaitExportUrls({ accessToken, jobId: exportJob.jobId })
  const pages: { page: number; buffer: Buffer }[] = []
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i])
    if (!res.ok) {
      throw new CanvaError(502, 'export_download_failed', `No se pudo descargar la página ${i + 1} del export Canva (${res.status}).`)
    }
    pages.push({ page: i + 1, buffer: Buffer.from(await res.arrayBuffer()) })
  }

  return { designId: generated.id, pages, usesRemaining }
}