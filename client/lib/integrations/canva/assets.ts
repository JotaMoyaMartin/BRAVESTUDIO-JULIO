import { canvaRequest } from './client'
import { pollCanvaJob } from './poll'

/**
 * Assets — para poner una foto de usuaria en un campo imagen del autofill
 * hay que convertirla en asset de Canva PRIMERO (la doc oficial dice que los
 * campos imagen del autofill solo aceptan asset_id; URLs externas no
 * soportadas). Vía ligera: /url-asset-uploads con una URL pública-temporal.
 *
 * En BRÄVE la foto ya vive en Storage (bucket photo-pro); el server genera
 * una signed URL (1h) y la entrega aquí — Canva la descarga una vez y el
 * asset vive dentro de la cuenta Canva del equipo.
 * Scope necesario: asset:write (+ asset:read). 30 req/min.
 * https://www.canva.dev/docs/apps/rest-apis/reference/assets/create-url-asset-upload-job/
 */

export async function createUrlAssetUpload(args: {
  accessToken: string
  name: string
  url: string
}): Promise<{ jobId: string }> {
  const json = await canvaRequest({
    accessToken: args.accessToken,
    path: '/url-asset-uploads',
    method: 'POST',
    body: { name: args.name, url: args.url },
  })
  const job = (json.job ?? {}) as { id?: string }
  if (!job.id) throw new Error('Respuesta de url-asset-uploads sin job.id')
  return { jobId: job.id }
}

/** Poll del asset upload → asset_id para usar en el autofill. */
export async function awaitAssetId(args: {
  accessToken: string
  jobId: string
  timeoutMs?: number
}): Promise<string> {
  const { body } = await pollCanvaJob<{ asset?: { id?: string; type?: string } }>({
    accessToken: args.accessToken,
    path: `/url-asset-uploads/${args.jobId}`,
    timeoutMs: args.timeoutMs ?? 60_000,
  })
  const asset = (body as { asset?: { id?: string } }).asset
  if (!asset?.id) throw new Error('Asset upload success sin asset.id')
  return asset.id
}