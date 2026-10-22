/**
 * DISEÑOS — plantillas DEMO para mostrar la experiencia completa
 * cuando aún no hay plantillas reales publicadas desde Canva.
 *
 * Cada plantilla tiene:
 *  - preview SVG inline (data URI) que simula el layout
 *  - bindings con zonas calibradas para el MODO ZONAS
 *  - campos ai_text, user_text y user_image realistas
 *
 * Se usan SOLO si el endpoint /api/design/templates devuelve vacío.
 * Cuando haya plantillas reales, estas desaparecen automáticamente.
 */
import { DesignTemplate } from './design'

/* ─── SVG helpers ──────────────────────────────────────────────────── */

function svgUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`
}

const CHERRY = '#7A1832'
const CREAM = '#FAF6F0'
const DARK = '#2B1215'
const WARM = '#3D1A20'
const GOLD = '#C9A96E'

function carouselSvg(opts: {
  bg: string; accent: string; title: string; subtitle: string; pageNum: number
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350">
  <rect fill="${opts.bg}" width="1080" height="1350"/>
  <rect fill="${opts.accent}" x="0" y="0" width="1080" height="8" opacity="0.8"/>
  <rect fill="white" x="80" y="120" width="920" height="520" rx="16" opacity="0.08"/>
  <text x="540" y="420" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="28" opacity="0.3">FOTO</text>
  <text x="540" y="780" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="48" font-weight="800" letter-spacing="-1">${opts.title}</text>
  <text x="540" y="840" text-anchor="middle" fill="${opts.accent}" font-family="system-ui,-apple-system,sans-serif" font-size="24" opacity="0.8">${opts.subtitle}</text>
  <rect fill="${opts.accent}" x="440" y="1060" width="200" height="48" rx="24" opacity="0.9"/>
  <text x="540" y="1092" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700">VER MÁS</text>
  <text x="540" y="1280" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="16" opacity="0.25">${opts.pageNum} / 5</text>
</svg>`
}

function storySvg(opts: {
  bg: string; accent: string; title: string; subtitle: string
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
  <rect fill="${opts.bg}" width="1080" height="1920"/>
  <rect fill="${opts.accent}" x="0" y="0" width="1080" height="6" opacity="0.8"/>
  <rect fill="white" x="60" y="200" width="960" height="680" rx="20" opacity="0.08"/>
  <text x="540" y="580" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="28" opacity="0.3">FOTO</text>
  <text x="540" y="1100" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="52" font-weight="800" letter-spacing="-1">${opts.title}</text>
  <text x="540" y="1170" text-anchor="middle" fill="${opts.accent}" font-family="system-ui,-apple-system,sans-serif" font-size="26" opacity="0.8">${opts.subtitle}</text>
  <rect fill="${opts.accent}" x="340" y="1400" width="400" height="56" rx="28" opacity="0.9"/>
  <text x="540" y="1436" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="20" font-weight="700">DESLIZA ↑</text>
</svg>`
}

/* ─── Plantillas demo ──────────────────────────────────────────────── */

export const DEMO_TEMPLATES: DesignTemplate[] = [
  // ─── CARRUSELES ──────────────────────────────────────────────────
  {
    id: 'demo-carousel-antes-despues',
    name: 'Antes y Después',
    category: 'Resultados',
    kind: 'carousel',
    pageCount: 5,
    previewUrl: svgUri(carouselSvg({ bg: DARK, accent: CHERRY, title: 'ANTES Y DESPUÉS', subtitle: 'Transformación real', pageNum: 1 })),
    previewUrls: [
      svgUri(carouselSvg({ bg: DARK, accent: CHERRY, title: 'ANTES Y DESPUÉS', subtitle: 'Transformación real', pageNum: 1 })),
      svgUri(carouselSvg({ bg: WARM, accent: GOLD, title: 'EL PROCESO', subtitle: 'Paso a paso', pageNum: 2 })),
      svgUri(carouselSvg({ bg: DARK, accent: CHERRY, title: 'RESULTADO FINAL', subtitle: 'Color + corte', pageNum: 3 })),
      svgUri(carouselSvg({ bg: WARM, accent: GOLD, title: 'CUIDADOS', subtitle: 'Para mantenerlo', pageNum: 4 })),
      svgUri(carouselSvg({ bg: DARK, accent: CHERRY, title: 'RESERVA', subtitle: '¿Quieres el tuyo?', pageNum: 5 })),
    ],
    dataset: {
      s1_titular: 'text',
      s1_subtitulo: 'text',
      s1_foto: 'image',
      s2_proceso: 'text',
      s3_resultado: 'text',
      s4_cuidados: 'text',
      s5_cta: 'text',
    },
    bindings: {
      s1_titular: {
        behavior: 'ai_text', label: 'Titular portada', purpose: 'gancho', maxLength: 35,
        instructions: 'Frase de impacto sobre la transformación de cabello',
        zone: { page: 1, x: 10, y: 52, w: 80, h: 8 },
      },
      s1_subtitulo: {
        behavior: 'ai_text', label: 'Subtítulo', purpose: 'desarrollo', maxLength: 30,
        zone: { page: 1, x: 25, y: 60, w: 50, h: 5 },
      },
      s1_foto: {
        behavior: 'user_image', label: 'Foto antes/después',
        zone: { page: 1, x: 7, y: 8, w: 86, h: 40 },
      },
      s2_proceso: {
        behavior: 'ai_text', label: 'Texto del proceso', purpose: 'desarrollo', maxLength: 80,
        zone: { page: 2, x: 10, y: 52, w: 80, h: 12 },
      },
      s3_resultado: {
        behavior: 'ai_text', label: 'Descripción resultado', purpose: 'deseo', maxLength: 60,
        zone: { page: 3, x: 10, y: 52, w: 80, h: 10 },
      },
      s4_cuidados: {
        behavior: 'ai_text', label: 'Consejos de cuidado', purpose: 'desarrollo', maxLength: 80,
        zone: { page: 4, x: 10, y: 52, w: 80, h: 12 },
      },
      s5_cta: {
        behavior: 'ai_text', label: 'Llamada a la acción', purpose: 'cta', maxLength: 40,
        zone: { page: 5, x: 15, y: 52, w: 70, h: 8 },
      },
    },
  },
  {
    id: 'demo-carousel-oferta',
    name: 'Oferta del mes',
    category: 'Ofertas',
    kind: 'carousel',
    pageCount: 3,
    previewUrl: svgUri(carouselSvg({ bg: '#1A1A2E', accent: '#E94560', title: 'OFERTA ESPECIAL', subtitle: 'Solo este mes', pageNum: 1 })),
    previewUrls: [
      svgUri(carouselSvg({ bg: '#1A1A2E', accent: '#E94560', title: 'OFERTA ESPECIAL', subtitle: 'Solo este mes', pageNum: 1 })),
      svgUri(carouselSvg({ bg: '#16213E', accent: '#E94560', title: 'QUÉ INCLUYE', subtitle: 'Servicio completo', pageNum: 2 })),
      svgUri(carouselSvg({ bg: '#1A1A2E', accent: '#E94560', title: 'RESERVA HOY', subtitle: 'Plazas limitadas', pageNum: 3 })),
    ],
    dataset: {
      s1_oferta: 'text',
      s1_precio: 'text',
      s2_detalle: 'text',
      s3_cta: 'text',
      s1_foto: 'image',
    },
    bindings: {
      s1_oferta: {
        behavior: 'ai_text', label: 'Título de la oferta', purpose: 'gancho', maxLength: 30,
        instructions: 'Nombre atractivo del servicio en oferta',
        zone: { page: 1, x: 10, y: 52, w: 80, h: 8 },
      },
      s1_precio: {
        behavior: 'user_text', label: 'Precio o descuento', maxLength: 20,
        zone: { page: 1, x: 25, y: 60, w: 50, h: 5 },
      },
      s2_detalle: {
        behavior: 'ai_text', label: 'Qué incluye', purpose: 'desarrollo', maxLength: 100,
        zone: { page: 2, x: 10, y: 52, w: 80, h: 15 },
      },
      s3_cta: {
        behavior: 'ai_text', label: 'Llamada a reservar', purpose: 'cta', maxLength: 35,
        zone: { page: 3, x: 15, y: 52, w: 70, h: 8 },
      },
      s1_foto: {
        behavior: 'user_image', label: 'Foto del servicio',
        zone: { page: 1, x: 7, y: 8, w: 86, h: 40 },
      },
    },
  },
  {
    id: 'demo-carousel-tips',
    name: '5 Tips de cuidado',
    category: 'Educativo',
    kind: 'carousel',
    pageCount: 5,
    previewUrl: svgUri(carouselSvg({ bg: '#1B2D2A', accent: '#4ECDC4', title: '5 TIPS', subtitle: 'Cuidado capilar', pageNum: 1 })),
    previewUrls: [
      svgUri(carouselSvg({ bg: '#1B2D2A', accent: '#4ECDC4', title: '5 TIPS', subtitle: 'Cuidado capilar', pageNum: 1 })),
      svgUri(carouselSvg({ bg: '#1E3A35', accent: '#4ECDC4', title: 'TIP 1', subtitle: 'Lavado', pageNum: 2 })),
      svgUri(carouselSvg({ bg: '#1B2D2A', accent: '#4ECDC4', title: 'TIP 2', subtitle: 'Secado', pageNum: 3 })),
      svgUri(carouselSvg({ bg: '#1E3A35', accent: '#4ECDC4', title: 'TIP 3', subtitle: 'Protección', pageNum: 4 })),
      svgUri(carouselSvg({ bg: '#1B2D2A', accent: '#4ECDC4', title: 'SÍGUEME', subtitle: 'Más consejos', pageNum: 5 })),
    ],
    dataset: {
      s1_titular: 'text',
      s2_tip1: 'text',
      s3_tip2: 'text',
      s4_tip3: 'text',
      s5_cta: 'text',
    },
    bindings: {
      s1_titular: {
        behavior: 'ai_text', label: 'Titular portada', purpose: 'gancho', maxLength: 40,
        instructions: 'Titular atractivo sobre cuidado de cabello',
        zone: { page: 1, x: 10, y: 52, w: 80, h: 8 },
      },
      s2_tip1: {
        behavior: 'ai_text', label: 'Tip 1', purpose: 'desarrollo', maxLength: 80,
        zone: { page: 2, x: 10, y: 52, w: 80, h: 12 },
      },
      s3_tip2: {
        behavior: 'ai_text', label: 'Tip 2', purpose: 'desarrollo', maxLength: 80,
        zone: { page: 3, x: 10, y: 52, w: 80, h: 12 },
      },
      s4_tip3: {
        behavior: 'ai_text', label: 'Tip 3', purpose: 'desarrollo', maxLength: 80,
        zone: { page: 4, x: 10, y: 52, w: 80, h: 12 },
      },
      s5_cta: {
        behavior: 'ai_text', label: 'Cierre + CTA', purpose: 'cta', maxLength: 40,
        zone: { page: 5, x: 15, y: 52, w: 70, h: 8 },
      },
    },
  },

  // ─── STORIES ─────────────────────────────────────────────────────
  {
    id: 'demo-story-promo',
    name: 'Promoción de servicio',
    category: 'Ofertas',
    kind: 'story',
    pageCount: 1,
    previewUrl: svgUri(storySvg({ bg: DARK, accent: CHERRY, title: 'PROMOCIÓN', subtitle: 'Servicio estrella' })),
    dataset: {
      titular: 'text',
      servicio: 'text',
      precio: 'text',
      cta: 'text',
      foto: 'image',
    },
    bindings: {
      titular: {
        behavior: 'ai_text', label: 'Titular', purpose: 'gancho', maxLength: 25,
        instructions: 'Frase corta de impacto para la promo',
        zone: { page: 1, x: 8, y: 53, w: 84, h: 6 },
      },
      servicio: {
        behavior: 'user_text', label: 'Nombre del servicio', maxLength: 30,
        zone: { page: 1, x: 15, y: 59, w: 70, h: 4 },
      },
      precio: {
        behavior: 'user_text', label: 'Precio', maxLength: 15,
        zone: { page: 1, x: 30, y: 64, w: 40, h: 4 },
      },
      cta: {
        behavior: 'ai_text', label: 'CTA', purpose: 'cta', maxLength: 20,
        zone: { page: 1, x: 25, y: 72, w: 50, h: 4 },
      },
      foto: {
        behavior: 'user_image', label: 'Foto del servicio',
        zone: { page: 1, x: 5, y: 10, w: 90, h: 36 },
      },
    },
  },
  {
    id: 'demo-story-transformacion',
    name: 'Resultado del día',
    category: 'Resultados',
    kind: 'story',
    pageCount: 1,
    previewUrl: svgUri(storySvg({ bg: '#1A1520', accent: GOLD, title: 'RESULTADO', subtitle: 'Del día' })),
    dataset: {
      titular: 'text',
      descripcion: 'text',
      cta: 'text',
      foto: 'image',
    },
    bindings: {
      titular: {
        behavior: 'ai_text', label: 'Titular', purpose: 'gancho', maxLength: 30,
        instructions: 'Frase destacando el resultado del trabajo de hoy',
        zone: { page: 1, x: 8, y: 53, w: 84, h: 6 },
      },
      descripcion: {
        behavior: 'ai_text', label: 'Descripción', purpose: 'deseo', maxLength: 60,
        zone: { page: 1, x: 10, y: 59, w: 80, h: 8 },
      },
      cta: {
        behavior: 'ai_text', label: 'CTA', purpose: 'cta', maxLength: 25,
        zone: { page: 1, x: 25, y: 72, w: 50, h: 4 },
      },
      foto: {
        behavior: 'user_image', label: 'Foto del resultado',
        zone: { page: 1, x: 5, y: 10, w: 90, h: 36 },
      },
    },
  },
  {
    id: 'demo-story-consejo',
    name: 'Consejo rápido',
    category: 'Educativo',
    kind: 'story',
    pageCount: 1,
    previewUrl: svgUri(storySvg({ bg: '#0D1B2A', accent: '#48BFE3', title: 'CONSEJO', subtitle: 'Sabías que…' })),
    dataset: {
      titular: 'text',
      consejo: 'text',
      cta: 'text',
    },
    bindings: {
      titular: {
        behavior: 'ai_text', label: 'Titular del consejo', purpose: 'gancho', maxLength: 30,
        instructions: 'Pregunta o afirmación sorprendente sobre cabello',
        zone: { page: 1, x: 8, y: 53, w: 84, h: 6 },
      },
      consejo: {
        behavior: 'ai_text', label: 'Texto del consejo', purpose: 'desarrollo', maxLength: 80,
        zone: { page: 1, x: 10, y: 59, w: 80, h: 10 },
      },
      cta: {
        behavior: 'ai_text', label: 'CTA', purpose: 'cta', maxLength: 25,
        zone: { page: 1, x: 25, y: 72, w: 50, h: 4 },
      },
    },
  },
]

/** Categorías únicas extraídas de los demos. */
export const DEMO_CATEGORIES = [...new Set(DEMO_TEMPLATES.map(t => t.category).filter(Boolean))] as string[]

/** Textos de ejemplo para cuando la IA no está disponible (demo mode). */
export const DEMO_TEXTS: Record<string, Record<string, string>> = {
  'demo-carousel-antes-despues': {
    s1_titular: 'De opaco a luminoso en una sesión',
    s1_subtitulo: 'Balayage natural + tratamiento',
    s2_proceso: 'Empezamos con una consulta personalizada. Elegimos los tonos que mejor van con tu tono de piel y tu estilo de vida.',
    s3_resultado: 'Un cabello que brilla con luz propia, con movimiento y sin dañar.',
    s4_cuidados: 'Usa champú sin sulfatos, aplica mascarilla una vez por semana y protege del calor siempre.',
    s5_cta: 'Reserva tu transformación',
  },
  'demo-carousel-oferta': {
    s1_oferta: 'Tratamiento de brillo intenso',
    s2_detalle: 'Incluye diagnóstico capilar, lavado con productos premium, tratamiento nutritivo y peinado. Resultado inmediato desde la primera sesión.',
    s3_cta: 'Escríbeme para reservar tu cita',
  },
  'demo-carousel-tips': {
    s1_titular: '5 errores que dañan tu cabello',
    s2_tip1: 'No uses agua muy caliente al lavar. El agua tibia cierra la cutícula y deja el pelo más brillante.',
    s3_tip2: 'Nunca frotes con la toalla: envuelve y presiona suavemente. Tu pelo mojado es frágil.',
    s4_tip3: 'Siempre protector térmico antes de la plancha. Siempre. Sin excepciones.',
    s5_cta: 'Guárdalo para no olvidarlo',
  },
  'demo-story-promo': {
    titular: 'Este mes, brilla más',
    cta: 'Reserva tu cita',
  },
  'demo-story-transformacion': {
    titular: 'Mira este cambio',
    descripcion: 'De un castaño apagado a un caramelo que refleja la luz. El color que siempre quiso.',
    cta: '¿Quieres el tuyo?',
  },
  'demo-story-consejo': {
    titular: '¿Cuántas veces lavas tu pelo?',
    consejo: 'Lavarlo a diario elimina los aceites naturales que lo protegen. Lo ideal es cada 2-3 días con un champú suave.',
    cta: 'Sígueme para más tips',
  },
  'canva-import-diseno15': {
    s1_gancho: '¿Sabías que dormir con el cabello mojado puede afectar mucho más que el peinado?',
    s1_destacado: 'el cabello mojado',
    s2_explicacion: 'Mantener el cuero cabelludo húmedo durante horas puede favorecer irritaciones, exceso de grasa y un cabello con menos brillo.',
    s2_conclusion: 'Lo ideal siempre es secarlo antes de dormir.',
    s3_pregunta_cta: '¿Quieres aprender a cuidar mejor tu melena?',
    s3_accion_cta: 'Escríbenos',
  },
}

/** ¿Es una plantilla demo? */
export function isDemoTemplate(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('canva-import-')
}

/* ─── Plantillas importadas de Canva (PNGs reales exportados) ────── */

/**
 * Plantilla importada del diseño Canva DAHOnzbmqJc "DISEÑO 15".
 * PNGs reales en /public/templates/canva-diseno15/.
 * Cada zona está calibrada pixel a pixel sobre el diseño original (1080×1350).
 *
 * Elementos detectados:
 *   Pág 1: foto polaroid (mujer pelo mojado), texto gancho, texto destacado
 *   Pág 2: foto lavado, texto explicativo, texto conclusión
 *   Pág 3: texto pregunta CTA, texto acción CTA
 */
export const CANVA_IMPORTED_TEMPLATES: DesignTemplate[] = [
  {
    id: 'canva-import-diseno15',
    name: 'Cuidado capilar — Cabello mojado',
    category: 'Educativo',
    kind: 'carousel',
    aspect: '4 / 5',
    pageCount: 3,
    previewUrl: '/templates/canva-diseno15/page1.png',
    previewUrls: [
      '/templates/canva-diseno15/page1.png',
      '/templates/canva-diseno15/page2.png',
      '/templates/canva-diseno15/page3.png',
    ],
    bgUrls: [
      '/templates/canva-diseno15/page1-bare.png',
      '/templates/canva-diseno15/page2-bg.png',
      '/templates/canva-diseno15/page3-bg.png',
    ],
    dataset: {
      s1_gancho: 'text',
      s1_destacado: 'text',
      s1_foto: 'image',
      s2_explicacion: 'text',
      s2_conclusion: 'text',
      s3_pregunta_cta: 'text',
      s3_accion_cta: 'text',
    },
    bindings: {
      // ── Página 1: Portada (bg #a78f60) ──
      s1_foto: {
        behavior: 'user_image', label: 'Foto principal',
        zone: { page: 1, x: 19.6, y: 15.4, w: 57, h: 46.5 },
        defaultPhotoUrl: '/templates/canva-diseno15/page1-photo.png',
      },
      s1_gancho: {
        behavior: 'ai_text', label: 'Texto gancho', purpose: 'gancho', maxLength: 70,
        instructions: 'Pregunta curiosa sobre cuidado capilar que llame la atención',
        defaultText: '¿Sabías que dormir \npuede afectar mucho más que el peinado?',
        zone: { page: 1, x: 13.2, y: 79, w: 73.6, h: 12.4 },
        zoneStyle: {
          fontFamily: 'var(--font-dmserif), "Georgia", serif',
          fontSize: '3.7cqw',
          color: '#f5f5ef',
          bg: 'transparent',
          fontWeight: '400',
          lineHeight: 1,
          textAlign: 'start',
        },
      },
      s1_destacado: {
        behavior: 'ai_text', label: 'Texto destacado grande', purpose: 'gancho', maxLength: 25,
        instructions: 'Frase central del tema — tipografía grande serif',
        defaultText: 'el cabello mojado',
        zone: { page: 1, x: 13.2, y: 82.4, w: 81.8, h: 7 },
        zoneStyle: {
          fontFamily: 'var(--font-dmserif), "Georgia", serif',
          fontSize: '7.3cqw',
          color: '#f5f5ef',
          bg: 'transparent',
          fontWeight: '400',
          lineHeight: 1.2,
          textAlign: 'start',
          letterSpacing: '-0.01em',
        },
      },

      // ── Página 2: Desarrollo (bg blanco) ──
      s2_explicacion: {
        behavior: 'ai_text', label: 'Texto explicativo', purpose: 'desarrollo', maxLength: 130,
        instructions: 'Explicación clara del problema o dato, tono educativo y cercano',
        defaultText: 'Mantener el cuero cabelludo húmedo durante horas puede favorecer irritaciones, exceso de grasa y un cabello con menos brillo.',
        zone: { page: 2, x: 32.2, y: 8.4, w: 58.6, h: 12.7 },
        zoneStyle: {
          fontFamily: 'var(--font-dmserif), "Georgia", serif',
          fontSize: '3.5cqw',
          color: '#a78f60',
          bg: 'transparent',
          fontWeight: '400',
          lineHeight: 1.1,
          textAlign: 'start',
        },
      },
      s2_conclusion: {
        behavior: 'ai_text', label: 'Consejo / conclusión', purpose: 'desarrollo', maxLength: 55,
        instructions: 'Frase de cierre con el consejo práctico — tipografía grande serif',
        defaultText: 'Lo ideal siempre es secarlo antes de dormir.',
        zone: { page: 2, x: 10, y: 80.8, w: 80.9, h: 10.9 },
        zoneStyle: {
          fontFamily: 'var(--font-dmserif), "Georgia", serif',
          fontSize: '5.7cqw',
          color: '#a78f60',
          bg: 'transparent',
          fontWeight: '400',
          lineHeight: 1.2,
          textAlign: 'start',
        },
      },

      // ── Página 3: CTA (bg #eceae4) ──
      s3_pregunta_cta: {
        behavior: 'ai_text', label: 'Pregunta CTA', purpose: 'cta', maxLength: 50,
        instructions: 'Pregunta que invite a contactar o seguir aprendiendo',
        defaultText: '¿Quieres aprender a cuidar mejor tu melena?',
        zone: { page: 3, x: 17, y: 39.7, w: 65.8, h: 10.3 },
        zoneStyle: {
          fontFamily: 'var(--font-dmserif), "Georgia", serif',
          fontSize: '5.9cqw',
          color: '#9f8454',
          fontWeight: '400',
          fontStyle: 'italic',
          lineHeight: 1,
          textAlign: 'center',
          letterSpacing: '-0.04em',
        },
      },
      s3_accion_cta: {
        behavior: 'user_text', label: 'Acción CTA', maxLength: 20,
        defaultText: 'escríbenos',
        zone: { page: 3, x: 22.7, y: 54.3, w: 54.5, h: 8.7 },
        zoneStyle: {
          fontFamily: 'var(--font-dmserif), "Georgia", serif',
          fontSize: '9.2cqw',
          color: '#9f8454',
          fontWeight: '400',
          lineHeight: 1.4,
          textAlign: 'center',
          letterSpacing: '-0.04em',
        },
      },
    },
  },
]

// Añadir las importadas de Canva a DEMO_TEMPLATES para que aparezcan en galería
DEMO_TEMPLATES.push(...CANVA_IMPORTED_TEMPLATES)
