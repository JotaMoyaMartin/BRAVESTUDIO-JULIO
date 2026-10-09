import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DesignTemplateLite,
  fetchPublishedTemplate,
  requireDesignAccess,
  templatePreviewUrl,
  toTemplateLite,
  isUuid,
} from '@/lib/design/server'

/**
 * UNA plantilla publicada del módulo clienta "Diseños". 404 si no existe o
 * no está published (draft/archived no existen para la clienta).
 */
export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  const { id } = context.params
  if (!isUuid(id)) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  try {
    const admin = createAdminClient()
    const row = await fetchPublishedTemplate(admin, id)
    if (!row) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    const template: DesignTemplateLite = toTemplateLite(
      await templatePreviewUrl(admin, row),
      row,
    )
    return NextResponse.json({ template })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}