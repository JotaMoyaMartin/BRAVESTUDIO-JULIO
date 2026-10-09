'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PATH_TO_SECTION: Record<string, string> = {
  '/inicio': 'inicio',
  '/planificar': 'planificar',
  '/crear-contenido': 'crear-contenido',
  '/mi-marca': 'mi-marca',
  '/biblioteca': 'biblioteca',
  '/calendario': 'calendario',
  '/stories': 'stories',
  '/stories-diseno': 'stories-diseno',
  '/inspiracion-reels': 'inspiracion-reels',
  '/banco-ganchos': 'banco-ganchos',
  '/foto-inspo': 'foto-inspo',
  // Foto Pro (8-oct-2026): /foto-pro y /foto-pro/retoque → misma sección.
  '/foto-pro': 'foto-pro',
  // Diseños (9-oct-2026): galería y detalle de plantilla → misma sección.
  '/disenos': 'disenos',
  '/transiciones-reels': 'transiciones-reels',
  '/reto-10k': 'reto-10k',
  '/mi-estrategia': 'mi-estrategia',
  '/plan-contenidos': 'plan-contenidos',
  '/teleprompter': 'teleprompter',
  '/carrusel': 'carrusel',
  '/analisis': 'analisis',
}

export default function SectionTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    // Match base path (first segment after domain)
    const base = '/' + (pathname.split('/')[1] || '')
    const section = PATH_TO_SECTION[base]
    if (!section) return

    fetch('/api/track-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section }),
    }).catch(() => {
      // silent fail — tracking is non-critical
    })
  }, [pathname])

  return null
}