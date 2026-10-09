import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireDesignAccess, listPublishedTemplates, DesignTemplateLite } from '@/lib/design/server'

/**
 * Plantillas PUBLICADAS del módulo clienta "Diseños".
 * La clienta solo ve este recurso: nada de Canva ni paths crudos (son server),
 * pero SÍ viajan dataset + bindings completos (con zonas calibradas por el
 * admin) y previewUrls signed de 7 días (una por página).
 */
export async function GET(_request: NextRequest) {
  const auth = await requireDesignAccess()
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status })

  try {
    const templates: DesignTemplateLite[] = await listPublishedTemplates()
    return NextResponse.json({ templates })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}