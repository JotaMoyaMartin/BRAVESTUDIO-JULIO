import { canvaRequest } from './client'
import { CanvaDesign, CanvaDataset, CanvaFieldType } from './types'

/**
 * GET /designs/{id} — metadata del diseño (scope design:meta:read, 100 req/min).
 * https://www.canva.dev/docs/apps/rest-apis/reference/designs/get-design/
 */
export async function getDesign(args: {
  accessToken: string
  designId: string
}): Promise<CanvaDesign> {
  const body = await canvaRequest({
    accessToken: args.accessToken,
    path: `/designs/${args.designId}`,
  })
  const design = (body.design ?? {}) as {
    id?: string
    title?: string
    page_count?: number
    updated_at?: number
    urls?: { edit_url?: string }
  }
  if (!design.id) throw new Error('Respuesta de design sin id')
  return {
    id: design.id,
    title: design.title ?? 'Sin título',
    pageCount: design.page_count ?? 1,
    updatedAt: design.updated_at ?? null,
    canvaEditUrl: design.urls?.edit_url ?? null,
  }
}

/**
 * GET /designs/{id}/dataset — los campos de Data Autofill del diseño
 * (scope design:content:read, 100 req/min). Shape oficial:
 * { dataset: { nombre_campo: { type: 'text'|'image'|'chart'|'sheet' } } }
 * Sin defaults. Un dataset vacío = diseño sin campos dinámicos.
 * https://www.canva.dev/docs/apps/rest-apis/reference/designs/get-design-dataset/
 */
export async function getDesignDataset(args: {
  accessToken: string
  designId: string
}): Promise<CanvaDataset> {
  const body = await canvaRequest({
    accessToken: args.accessToken,
    path: `/designs/${args.designId}/dataset`,
  })
  const raw = (body.dataset ?? {}) as Record<string, { type?: string }>
  const dataset: CanvaDataset = {}
  for (const [name, def] of Object.entries(raw)) {
    const type = def?.type
    if (type === 'text' || type === 'image' || type === 'chart' || type === 'sheet') {
      dataset[name] = type as CanvaFieldType
    }
  }
  return dataset
}