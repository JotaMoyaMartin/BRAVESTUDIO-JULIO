// Strategy document types for Mi Marca

export interface ServicePriority {
  name: string
  priority: 'alta' | 'media' | 'baja'
  reason: string
}

export interface ObjectiveItem {
  timeframe: string
  goal: string
  action: string
}

export interface ContentStrategyItem {
  type: string
  percentage: number
  reason: string
}

export interface ContentPillar {
  name: string
  description: string
  examples: string[]
}

export interface ActionItem {
  text: string
  done: boolean
}

export interface StrategyDocument {
  perfil_brave: string
  resumen_ejecutivo: string
  clienta_ideal: {
    descripcion: string
    edad: string
    problemas: string[]
    deseos: string[]
    objeciones: string[]
  }
  servicios: ServicePriority[]
  objetivos: ObjectiveItem[]
  estrategia_contenido: ContentStrategyItem[]
  pilares_contenido: ContentPillar[]
  estilo_comunicacion: {
    tono: string
    voz: string
    ejemplos: string[]
  }
  imagen_personal: {
    descripcion: string
    consejos: string[]
  }
  recomendaciones_visuales: string[]
  errores_detectados: string[]
  plan_accion: ActionItem[]
  resumen_para_ia: string
}

export const EMPTY_STRATEGY: StrategyDocument = {
  perfil_brave: '',
  resumen_ejecutivo: '',
  clienta_ideal: { descripcion: '', edad: '', problemas: [], deseos: [], objeciones: [] },
  servicios: [],
  objetivos: [],
  estrategia_contenido: [],
  pilares_contenido: [],
  estilo_comunicacion: { tono: '', voz: '', ejemplos: [] },
  imagen_personal: { descripcion: '', consejos: [] },
  recomendaciones_visuales: [],
  errores_detectados: [],
  plan_accion: [],
  resumen_para_ia: '',
}

/**
 * Defensively fills missing fields of a StrategyDocument.
 * Real-world `strategy_json` from the DB (or stale session state in localStorage)
 * can be `{}` or partial — without this, `StrategyDisplay` crashes the moment it
 * calls `strategy.clienta_ideal.descripcion` or `strategy.servicios.map(...)`.
 */
export function normalizeStrategy(s: unknown): StrategyDocument | null {
  if (!s || typeof s !== 'object') return null
  const src = s as Partial<StrategyDocument>
  const ci = (src.clienta_ideal && typeof src.clienta_ideal === 'object') ? src.clienta_ideal : {}
  const ec = (src.estilo_comunicacion && typeof src.estilo_comunicacion === 'object') ? src.estilo_comunicacion : {}
  const ip = (src.imagen_personal && typeof src.imagen_personal === 'object') ? src.imagen_personal : {}
  const asArray = (v: unknown): any[] => Array.isArray(v) ? v : []
  return {
    perfil_brave: typeof src.perfil_brave === 'string' ? src.perfil_brave : '',
    resumen_ejecutivo: typeof src.resumen_ejecutivo === 'string' ? src.resumen_ejecutivo : '',
    clienta_ideal: {
      descripcion: typeof (ci as any).descripcion === 'string' ? (ci as any).descripcion : '',
      edad: typeof (ci as any).edad === 'string' ? (ci as any).edad : '',
      problemas: asArray((ci as any).problemas) as string[],
      deseos: asArray((ci as any).deseos) as string[],
      objeciones: asArray((ci as any).objeciones) as string[],
    },
    servicios: asArray(src.servicios).map((x: any) => ({
      name: typeof x?.name === 'string' ? x.name : '',
      priority: x?.priority === 'alta' || x?.priority === 'media' || x?.priority === 'baja' ? x.priority : 'media',
      reason: typeof x?.reason === 'string' ? x.reason : '',
    })) as ServicePriority[],
    objetivos: asArray(src.objetivos).map((x: any) => ({
      timeframe: typeof x?.timeframe === 'string' ? x.timeframe : '',
      goal: typeof x?.goal === 'string' ? x.goal : '',
      action: typeof x?.action === 'string' ? x.action : '',
    })) as ObjectiveItem[],
    estrategia_contenido: asArray(src.estrategia_contenido).map((x: any) => ({
      type: typeof x?.type === 'string' ? x.type : '',
      percentage: typeof x?.percentage === 'number' ? x.percentage : 0,
      reason: typeof x?.reason === 'string' ? x.reason : '',
    })) as ContentStrategyItem[],
    pilares_contenido: asArray(src.pilares_contenido).map((x: any) => ({
      name: typeof x?.name === 'string' ? x.name : '',
      description: typeof x?.description === 'string' ? x.description : '',
      examples: asArray(x?.examples) as string[],
    })) as ContentPillar[],
    estilo_comunicacion: {
      tono: typeof (ec as any).tono === 'string' ? (ec as any).tono : '',
      voz: typeof (ec as any).voz === 'string' ? (ec as any).voz : '',
      ejemplos: asArray((ec as any).ejemplos) as string[],
    },
    imagen_personal: {
      descripcion: typeof (ip as any).descripcion === 'string' ? (ip as any).descripcion : '',
      consejos: asArray((ip as any).consejos) as string[],
    },
    recomendaciones_visuales: asArray(src.recomendaciones_visuales) as string[],
    errores_detectados: asArray(src.errores_detectados) as string[],
    plan_accion: asArray(src.plan_accion).map((x: any) => ({
      text: typeof x?.text === 'string' ? x.text : '',
      done: !!x?.done,
    })) as ActionItem[],
    resumen_para_ia: typeof src.resumen_para_ia === 'string' ? src.resumen_para_ia : '',
  }
}