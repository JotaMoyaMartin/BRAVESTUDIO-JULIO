import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireDesignAccess, listPublishedTemplates, DesignTemplateLite } from '@/lib/design/server'

/**
 * Plantillas PUBLICADAS del módulo clienta "Diseños".
 * La clienta solo ve este recurso: nada de Canva, provider, bindings internos
 * de admin ni paths crudos de preview (ese dato sí viaja: es un path sin URL).
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