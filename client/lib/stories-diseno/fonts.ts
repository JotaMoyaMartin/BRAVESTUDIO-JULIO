/**
 * STORIES DISEÑO — tipografías curadas (8-oct-2026, petición de Jota).
 *
 * Cada entrada se monta como variable next/font en `app/layout.tsx` (el
 * nombre de familia que genera next/font es hash, así que el canvas SIEMPRE
 * referencia la variable CSS, no el nombre literal). El valor `css` se
 * guarda como DATO de plantilla en `style.fontFamily` (jsonb) y lo pinta
 * SlideCanvas — html-to-image exporta leyendo computed styles, así que hay
 * que asegurar que la fuente ya se pintó en la página antes de exportar.
 *
 * Lista cerrada — Jota rechaza las "típicas de IA": nunca
 * Cormorant/Playfair/Inter/Manrope/Jost.
 */
export interface StoryFontOption {
  /** Clave estable (picker + seeds). */
  key: string
  label: string
  /** Valor EXACTO para style.fontFamily (con fallback). */
  css: string
}

export const STORY_FONTS: StoryFontOption[] = [
  { key: 'poppins', label: 'Poppins', css: 'var(--font-poppins, Poppins), Poppins, sans-serif' },
  { key: 'montserrat', label: 'Montserrat', css: 'var(--font-montserrat, Montserrat), Montserrat, sans-serif' },
  { key: 'grotesk', label: 'Space Grotesk', css: 'var(--font-grotesk, Space Grotesk), sans-serif' },
  { key: 'fraunces', label: 'Fraunces (serif)', css: 'var(--font-fraunces, Fraunces), Georgia, serif' },
  { key: 'dmserif', label: 'DM Serif', css: 'var(--font-dmserif, DM Serif Display), Georgia, serif' },
  { key: 'bebas', label: 'Bebas (titular alta)', css: 'var(--font-bebas, Bebas Neue), sans-serif' },
  { key: 'archivo', label: 'Archivo Black (gruesa)', css: 'var(--font-archivo, Archivo Black), sans-serif' },
  { key: 'yellowtail', label: 'Yellowtail (firma)', css: 'var(--font-yellowtail, Yellowtail), cursive' },
]

/** Tipografía por defecto del lienzo cuando el elemento no define fontFamily. */
export const DEFAULT_FONT_CSS = STORY_FONTS[0].css

export function fontByCss(css: string | undefined): StoryFontOption | null {
  if (!css) return null
  return STORY_FONTS.find(f => f.css === css) ?? null
}