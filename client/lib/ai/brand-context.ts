// Construye el bloque "USAR MI MARCA" — contexto completo del salón
// que se inyecta en los prompts de generación de contenido y planificación
// cuando la usuaria activa el toggle "USAR MI MARCA".

import { StrategyDocument } from '@/lib/strategy-types'

export interface BrandFullContextInput {
  salon_name?: string | null
  optimized_summary?: string | null
  service_to_promote?: string | null
  main_services?: string[] | null
  strategy_json?: Record<string, unknown> | null
  raw_input?: string | null
}

/**
 * Devuelve true si hay suficiente información de marca para activar
 * el toggle "USAR MI MARCA" por defecto.
 */
export function hasBrandContext(brand: BrandFullContextInput | null | undefined): boolean {
  if (!brand) return false
  return Boolean(
    brand.optimized_summary ||
      brand.strategy_json ||
      brand.service_to_promote ||
      (brand.main_services && brand.main_services.length > 0)
  )
}

function pickStrategy(brand: BrandFullContextInput): StrategyDocument | null {
  const raw = brand.strategy_json
  if (!raw) return null
  try {
    return raw as unknown as StrategyDocument
  } catch {
    return null
  }
}

/**
 * Genera el bloque de texto plano que se inyecta en los prompts.
 * Incluye: servicios a promocionar, servicios principales, clienta ideal,
 * pilares de contenido, estilo de comunicación, objetivos y resumen para IA.
 */
export function buildBrandFullContext(brand: BrandFullContextInput): string {
  const parts: string[] = []

  if (brand.salon_name) {
    parts.push(`SALÓN: ${brand.salon_name}`)
  }

  // Servicio a promocionar (lo más importante para dirección de contenido)
  if (brand.service_to_promote) {
    parts.push(`⭐ SERVICIO A PROMOCIONAR PRIORITARIAMENTE: ${brand.service_to_promote}`)
  }

  // Servicios principales
  if (brand.main_services && brand.main_services.length > 0) {
    parts.push(`SERVICIOS PRINCIPALES: ${brand.main_services.join(', ')}`)
  }

  const s = pickStrategy(brand)

  if (s) {
    if (s.perfil_brave) {
      parts.push(`PERFIL DE MARCA: ${s.perfil_brave}`)
    }

    if (s.clienta_ideal) {
      const ci = s.clienta_ideal
      const ciParts: string[] = []
      if (ci.descripcion) ciParts.push(ci.descripcion)
      if (ci.edad) ciParts.push(`Edad: ${ci.edad}`)
      if (ci.problemas && ci.problemas.length) ciParts.push(`Problemas: ${ci.problemas.join('; ')}`)
      if (ci.deseos && ci.deseos.length) ciParts.push(`Deseos: ${ci.deseos.join('; ')}`)
      if (ci.objeciones && ci.objeciones.length) ciParts.push(`Objeciones: ${ci.objeciones.join('; ')}`)
      if (ciParts.length) parts.push(`CLIENTA IDEAL: ${ciParts.join(' | ')}`)
    }

    if (s.servicios && s.servicios.length) {
      const sv = s.servicios.map(x => `${x.name} (${x.priority})`).join(', ')
      parts.push(`SERVICIOS ESTRATÉGICOS: ${sv}`)
    }

    if (s.pilares_contenido && s.pilares_contenido.length) {
      const pil = s.pilares_contenido.map(p => `${p.name}: ${p.description}`).join(' | ')
      parts.push(`PILARES DE CONTENIDO: ${pil}`)
    }

    if (s.estilo_comunicacion) {
      const ec = s.estilo_comunicacion
      const ecParts: string[] = []
      if (ec.tono) ecParts.push(`Tono: ${ec.tono}`)
      if (ec.voz) ecParts.push(`Voz: ${ec.voz}`)
      if (ecParts.length) parts.push(`ESTILO DE COMUNICACIÓN: ${ecParts.join(' | ')}`)
    }

    if (s.objetivos && s.objetivos.length) {
      const obj = s.objetivos.map(o => `${o.timeframe}: ${o.goal} → ${o.action}`).join(' | ')
      parts.push(`OBJETIVOS: ${obj}`)
    }

    if (s.errores_detectados && s.errores_detectados.length) {
      parts.push(`ERRORES A EVITAR: ${s.errores_detectados.join('; ')}`)
    }
  }

  // Resumen compacto para IA — siempre al final como contexto permanente
  if (brand.optimized_summary) {
    parts.push(`RESUMEN PARA IA (contexto permanente): ${brand.optimized_summary}`)
  }

  return parts.join('\n').trim()
}