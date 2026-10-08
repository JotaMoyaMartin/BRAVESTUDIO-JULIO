import { canvaRequest } from './client'
import { pollCanvaJob } from './poll'
import { CanvaDesign } from './types'

/**
 * Autofill — POST /autofills (scope design:content:write, 60 req/min).
 *
 * Usamos SIEMPRE type "create_from_design": crea un design NUEVO con los
 * valores de la usuaria y el design master queda INTACTO (nunca update_design
 * sobre plantillas master — regla #19 del producto).
 *
 * Shape de valores (doc oficial):
 *   texto: { type: 'text', text: '...' }
 *   imagen: { type: 'image', asset_id: '...' }  ← solo asset_id, no URLs.
 *
 * https://www.canva.dev/docs/apps/rest-apis/reference/autofills/create-design-autofill-job/
 */

export interface AutofillDataEntry {
  type: 'text'
  text: string
}

export interface AutofillMediaEntry {
  type: 'image'
  asset_id: string
}

export type AutofillDataValue = AutofillDataEntry | AutofillMediaEntry

interface AutofillJobSuccessBody {
  id: string
  status: 'success'
  result: {
    type: string
    design: {
      id: string
      title?: string
      urls?: { edit_url?: string; view_url?: string }
      created_at?: number
    }
    trial_information?: { uses_remaining?: number; upgrade_url?: string }
  }
}

/** Lanza el autofill (create_from_design) → job id. */
export async function createAutofillFromDesign(args: {
  accessToken: string
  designId: string
  data: Record<string, AutofillDataValue>
  title?: string
}): Promise<{ jobId: string }> {
  const body: {
    type: 'create_from_design'
    design_id: string
    data: Record<string, AutofillDataValue>
    title?: string
  } = {
    type: 'create_from_design',
    design_id: args.designId,
    data: args.data,
  }
  if (args.title) body.title = args.title
  const json = await canvaRequest({
    accessToken: args.accessToken,
    path: '/autofills',
    method: 'POST',
    body,
  })
  const job = (json.job ?? {}) as { id?: string }
  if (!job.id) throw new Error('Respuesta de autofills sin job.id')
  return { jobId: job.id }
}

/** Poll del autofill job hasta success → design generado nuevo. */
export async function awaitAutofillDesign(args: {
  accessToken: string
  jobId: string
  timeoutMs?: number
}): Promise<{ design: CanvaDesign; usesRemaining: number | null }> {
  const { body } = await pollCanvaJob<AutofillJobSuccessBody>({
    accessToken: args.accessToken,
    path: `/autofills/${args.jobId}`,
    timeoutMs: args.timeoutMs ?? 90_000,
  })
  const design = body.result.design
  if (!design?.id) throw new Error('Autofill success sin design.id')
  return {
    design: {
      id: design.id,
      title: design.title ?? 'Resultado generado',
      pageCount: 1,
      updatedAt: null,
      canvaEditUrl: design.urls?.edit_url ?? null,
    },
    usesRemaining: body.result.trial_information?.uses_remaining ?? null,
  }
}