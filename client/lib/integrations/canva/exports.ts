import { canvaRequest } from './client'
import { pollCanvaJob } from './poll'

/**
 * Export — POST /exports (scope design:content:read, 20 req/min para crear,
 * 120 req/min para consultar). PNG por defecto, una URL POR PÁGINA
 * (as_single_image false). Las urls expiran en 24h → download inmediato
 * a Storage de BRÄVE (nunca guardar solo la URL temporal).
 * https://www.canva.dev/docs/apps/rest-apis/reference/exports/create-design-export-job/
 */

interface ExportJobSuccessBody {
  id: string
  status: 'success'
  urls: string[]
}

/** Lanza el export PNG del design generado → job id. */
export async function createPngExport(args: {
  accessToken: string
  designId: string
  /** Páginas concretas (1-indexed); undefined = todas. */
  pages?: number[]
}): Promise<{ jobId: string }> {
  const format: Record<string, unknown> = { type: 'png' }
  if (args.pages && args.pages.length > 0) format.pages = args.pages
  const json = await canvaRequest({
    accessToken: args.accessToken,
    path: '/exports',
    method: 'POST',
    body: { design_id: args.designId, format },
  })
  const job = (json.job ?? {}) as { id?: string }
  if (!job.id) throw new Error('Respuesta de exports sin job.id')
  return { jobId: job.id }
}

/** Poll del export job hasta success → urls[] temporales (24h). */
export async function awaitExportUrls(args: {
  accessToken: string
  jobId: string
  timeoutMs?: number
}): Promise<string[]> {
  const { body } = await pollCanvaJob<ExportJobSuccessBody>({
    accessToken: args.accessToken,
    path: `/exports/${args.jobId}`,
    timeoutMs: args.timeoutMs ?? 150_000,
  })
  const urls = body.urls ?? []
  if (urls.length === 0) throw new Error('Export success sin urls')
  return urls
}