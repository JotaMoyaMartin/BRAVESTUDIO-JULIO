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