import { CarouselFamily, CarouselPalette } from './types'

// Tres familias visuales V1 — mejor 3 excelentes que 15 mediocres.
// Los valores provienen de los tokens de diseño BRÄVE (globals.css @theme);
// en canvas 2D se necesitan literales, así que espejan los tokens oficiales.
const TOKENS = {
  cream: '#FFFDF5',
  warmLight: '#FFF8E7',
  warmGray: '#F5F0E8',
  buttermilk: '#FFF1B5',
  pastelBlue: '#C1DBE8',
  cherry: '#7A1832',
  cherryDark: '#591427',
  ink: '#1a1a1a',
  blueInk: '#1a3a4a',
  white: '#FFFFFF',
} as const

// Tokens de la familia Editorial — espejan los colores muestreados del diseño papel (DISEÑO 3).
const EDITORIAL_TOKENS = {
  putty: '#D9D9DA', // fondo portada (muestreado del PDF)
  beige: '#E2E0D5', // fondo statement (muestreado del PDF)
  ink: '#2B2B2B', // texto papel statement
  hairline: '#403C39', // tiras oscuras del layout foto
  paper: '#FFFFFF',
} as const

export { EDITORIAL_TOKENS }

export interface CarouselFamilyDef {
  id: CarouselFamily
  name: string
  description: string
  palettes: CarouselPalette[]
}

export const CAROUSEL_FAMILIES: CarouselFamilyDef[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Editorial, limpia, premium',
    palettes: [
      { bg: TOKENS.cream, ink: TOKENS.ink, accent: TOKENS.cherry, onAccent: TOKENS.cream },
      { bg: TOKENS.buttermilk, ink: TOKENS.cherryDark, accent: TOKENS.cherry, onAccent: TOKENS.cream },
    ],
  },
  {
    id: 'beauty',
    name: 'Beauty',
    description: 'Visual, fotografías protagonistas',
    palettes: [
      { bg: TOKENS.warmLight, ink: TOKENS.cherryDark, accent: TOKENS.cherry, onAccent: TOKENS.cream },
      { bg: TOKENS.pastelBlue, ink: TOKENS.blueInk, accent: TOKENS.cherry, onAccent: TOKENS.cream },
    ],
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Titulares fuertes y contraste',
    palettes: [
      { bg: TOKENS.ink, ink: TOKENS.cream, accent: TOKENS.buttermilk, onAccent: TOKENS.cherryDark },
      { bg: TOKENS.cherry, ink: TOKENS.cream, accent: TOKENS.buttermilk, onAccent: TOKENS.cherryDark },
    ],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Papel, polaroid y fotografía real',
    palettes: [
      { bg: EDITORIAL_TOKENS.beige, ink: EDITORIAL_TOKENS.ink, accent: TOKENS.cherry, onAccent: TOKENS.cream },
    ],
  },
]

export function getFamily(id: CarouselFamily): CarouselFamilyDef {
  return CAROUSEL_FAMILIES.find(f => f.id === id) ?? CAROUSEL_FAMILIES[0]
}

/** Marca pequeña en cada slide: nombre del salón (Mi Marca) o BRÄVE. */
export function brandMarkText(salonName?: string | null): string {
  return (salonName || '').trim() || 'BRÄVE'
}