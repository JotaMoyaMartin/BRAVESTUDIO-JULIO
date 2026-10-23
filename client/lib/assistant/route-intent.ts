/**
 * ASISTENTE (22-oct-2026): la barra de Inicio entiende qué quiere la
 * estilista y la lleva a la herramienta correcta con la idea ya puesta.
 * Reglas simples por palabras (rápido, gratis y predecible); lo que no
 * encaja va al chat de Bravi en /asistente.
 */
import { setSessionValue } from '@/lib/session-store'

export type IntentTool = 'guion' | 'story' | 'carrusel' | 'foto' | 'plan' | 'instagram' | 'ganchos' | 'virales' | 'asistente'

export interface IntentResult {
  tool: IntentTool
  href: string
  /** Frase corta para el aviso: «Te llevo a Carruseles con tu idea». */
  label: string
}

const RULES: Array<[IntentTool, RegExp]> = [
  ['story', /\b(stor(y|ies)|historias?|encuesta|caja de preguntas)\b/],
  ['carrusel', /\b(carrusel(es)?|carousel|slides?|diapositivas?)\b/],
  ['ganchos', /\b(gancho|ganchos|hook|hooks)\b/],
  ['virales', /\b(virales?|tendencias?|trend|inspiraci[oó]n|transici[oó]n(es)?)\b/],
  ['guion', /\b(reels?|gui[oó]n(es)?|v[ií]deos?|grabar|teleprompter)\b/],
  ['foto', /\b(fotos?|imagen(es)?|retoc\w*|fondo|filtro|selfie|antes y despu[eé]s)\b/],
  ['instagram', /\b(instagram|perfil|bio|biograf[ií]a|seguidores|m[eé]tricas|an[aá]lisis)\b/],
  ['plan', /\b(planifica\w*|calendario|mi plan|organiza\w*|semana|este mes|el mes)\b/],
]

const LABELS: Record<IntentTool, string> = {
  guion: 'Crear guiones', story: 'Stories', carrusel: 'Carruseles', foto: 'Estudio de fotos',
  plan: 'Mi plan', instagram: 'Análisis de Instagram', ganchos: 'Banco de Ganchos',
  virales: 'Reels virales', asistente: 'tu Asistente',
}

/** Qué herramienta encaja con el texto (sin efectos). */
export function detectIntent(text: string): IntentTool {
  const t = text.toLowerCase()
  for (const [tool, re] of RULES) if (re.test(t)) return tool
  return 'asistente'
}

/**
 * Deja la idea preparada en la herramienta y devuelve a dónde ir.
 * El texto viaja por el almacenamiento del navegador (nunca en la URL).
 */
export function routeIntent(text: string, userId: string): IntentResult {
  const idea = text.trim()
  const tool = detectIntent(idea)
  const u = `u:${userId}`
  let href = '/asistente'

  switch (tool) {
    case 'guion':
      // Crear guiones arranca en «tema» con la idea escrita.
      setSessionValue(`${u}:guiones2:step`, 'topic')
      setSessionValue(`${u}:guiones2:idea`, idea)
      setSessionValue(`${u}:guiones2:current`, null)
      setSessionValue(`${u}:guiones2:hooks`, [])
      setSessionValue(`${u}:guiones2:picked`, null)
      href = '/crear-contenido'
      break
    case 'story':
      setSessionValue(`${u}:stories:tab3`, 'crear')
      setSessionValue(`${u}:stories:freeText`, idea)
      setSessionValue(`${u}:stories:result`, null)
      href = '/stories'
      break
    case 'carrusel':
      setSessionValue(`${u}:carruseles:premium:v1`, {
        styleId: null, view: 'style', topic: idea, topicChips: [], slideCount: 'auto',
        proposal: null, ctaOverride: null, signature: { on: false, text: '' },
      })
      href = '/carrusel'
      break
    case 'foto': href = '/estudio?paso=editala'; break
    case 'plan': href = '/planificar'; break
    case 'instagram': href = '/analisis'; break
    case 'ganchos': href = '/banco-ganchos'; break
    case 'virales': href = '/inspiracion-reels'; break
    default: href = '/asistente'
  }
  return { tool, href, label: LABELS[tool] }
}
