// Banco de Ganchos — los 80 ganchos de Jota (26-sep-2026) en 4 categorías.
// Cada categoría es una INTENCIÓN distinta; los ganchos funcionan como
// PATRONES: la IA puede reescribirlos para cualquier servicio sin que
// parezcan copiados (ver buildGanchoVariationsPrompt en lib/ai/prompts/ganchos.ts).

export type GanchoCategoryId = 'instantaneos' | 'consejos' | 'principiantes' | 'narrativa'

export interface GanchoCategoryMeta {
  id: GanchoCategoryId
  name: string
  /** Objetivo que escribió Jota en el banco original. */
  objective: string
  /** Patrón/plantilla de la categoría (mapa de intenciones) — alimenta a la IA. */
  pattern: string
  hook: string // one-liner para la UI
}

export const GANCHO_CATEGORY_META: GanchoCategoryMeta[] = [
  {
    id: 'instantaneos',
    name: 'Instantáneos',
    objective: 'Captar atención en los primeros 2 segundos.',
    pattern: 'Si te pasa X, probablemente estés haciendo Y.',
    hook: 'Detienen el scroll en 2 segundos',
  },
  {
    id: 'consejos',
    name: 'Consejos y hacks',
    objective: 'Aportar valor práctico que genere guardados y compartidos.',
    pattern: '3 formas de conseguir X sin Y.',
    hook: 'Aportan valor práctico → guardados',
  },
  {
    id: 'principiantes',
    name: 'Principiantes paso a paso',
    objective: 'Enseñar, simplificar y construir autoridad.',
    pattern: 'Cómo hacer X paso a paso.',
    hook: 'Enseñan paso a paso → autoridad',
  },
  {
    id: 'narrativa',
    name: 'Narrativa y mentalidad',
    objective: 'Mostrar el lado humano del estilista y generar conexión.',
    pattern: 'Lo que aprendí después de X años haciendo Y.',
    hook: 'Conexión humana → confianza',
  },
]

export const GANCHOS: Record<GanchoCategoryId, string[]> = {
  instantaneos: [
    'Si tienes el pelo fino, deja de hacer esto.',
    'Si tu rubio siempre acaba amarillo, esto te interesa.',
    'Si tus mechas nunca quedan como la foto que enseñas, te explico por qué.',
    '¿Te lavas el pelo y al día siguiente ya está graso? Mira esto.',
    'Si tienes canas y estás cansada de teñirte cada mes, hay otra opción.',
    'Si tu pelo se rompe aunque uses mascarilla, puede que estés haciendo esto mal.',
    'Antes de hacerte un balayage, necesitas saber esto.',
    'Si tienes poco pelo, este corte puede hacer que parezca mucho más abundante.',
    '¿Tu pelo está siempre encrespado? Probablemente este sea el motivo.',
    'Si estás pensando en cortarte el pelo corto, mira esto antes.',
    'Tres cosas que jamás haría si tuviera el pelo decolorado.',
    'Si quieres dejarte las canas sin pasar meses con una raya horrible, mira esto.',
    '¿Por qué tu pelo queda increíble en la peluquería y en casa no? Te lo cuento.',
    'Si utilizas plancha todas las semanas, necesitas saber esto.',
    'Antes de comprarte otro champú caro, escucha esto.',
    'Si tu color pierde el brillo enseguida, puede que este sea el problema.',
    'Si estás pensando en ponerte extensiones, no lo hagas sin saber esto.',
    '¿No sabes qué corte te favorece? Fíjate primero en esto.',
    'Si llevas años haciéndote siempre lo mismo, quizá necesitas ver esto.',
    'Si quieres cambiar de look pero te da miedo arrepentirte, empieza por aquí.',
  ],
  consejos: [
    '5 formas de conseguir que tu color dure mucho más tiempo.',
    '3 trucos para que tu pelo se vea más sano al instante.',
    'La pregunta clave que debes hacerte antes de cambiar de look.',
    'Cómo saber qué corte favorece más según la forma de tu cara.',
    '5 cosas que puedes hacer en casa para mantener tu pelo como recién salido de la peluquería.',
    'Cómo preparar tu pelo antes de un tratamiento de color.',
    '3 formas de dar más volumen si tienes el pelo fino.',
    'El truco para un alisado o moldeado que dure mucho más.',
    'Cómo evitar el encrespamiento en días de humedad.',
    '5 productos básicos que realmente valen la pena.',
    'Cómo elegir el tono de rubio perfecto según tu tono de piel.',
    '3 cosas que nunca deberías hacer si tienes el pelo decolorado.',
    'Cómo cuidar tus extensiones para que duren más tiempo.',
    'La rutina mínima para tener un pelo sano y con brillo.',
    'Cómo disimular las canas sin teñirte cada mes.',
    '3 señales de que tu pelo necesita un corte aunque quieras dejarlo largo.',
    'Cómo peinar tu pelo según el estilo que quieras conseguir.',
    '5 errores que hacen que tu color se vea apagado.',
    'Cómo proteger tu pelo del calor de las herramientas.',
    'La fórmula para un cabello con más movimiento y naturalidad.',
  ],
  principiantes: [
    'Cómo empezar a cuidar tu pelo según tu tipo de cabello.',
    'Las 5 cosas que me habría gustado saber antes de hacerme mechas.',
    'Cómo preparar tu pelo antes de un cambio de color.',
    'Paso a paso: así se hace un balayage desde cero.',
    'Qué corte te favorece según la forma de tu cara.',
    'Cómo elegir el tono de rubio perfecto según tu tono de piel.',
    'El error más común al lavarte el pelo y cómo evitarlo.',
    'Cómo usar correctamente la mascarilla para notar la diferencia.',
    'Qué productos necesitas realmente y cuáles son un gasto innecesario.',
    'Cómo peinar tu pelo en casa para que dure más días.',
    'Cómo saber si necesitas matizar el color y cuándo.',
    'Paso a paso: así cuidamos un pelo dañado.',
    'Cómo conseguir más volumen si tienes el pelo fino.',
    'Cómo disimular las canas sin teñirte cada mes.',
    'La rutina básica para un pelo sano y con brillo.',
    'Cómo mantener tu alisado o moldeado durante más tiempo.',
    'Qué extensiones elegir según tu tipo de pelo.',
    'Cómo evitar el encrespamiento en días de humedad.',
    'Paso a paso: transformación de cabello en 3 piezas de contenido.',
    'Cómo conseguir un peinado fácil y bonito en menos de 5 minutos.',
  ],
  narrativa: [
    'Lo que nadie te cuenta cuando empiezas a trabajar de peluquero.',
    'El error que más cometía cuando empecé a hacer mechas.',
    'Una cosa que jamás volvería a hacerle al pelo de una clienta.',
    'Lo que he aprendido después de atender a cientos de clientas.',
    'Antes me daba miedo decirle esto a una clienta. Ahora siempre lo hago.',
    'El día que entendí que no todos los rubios son para todo el mundo.',
    'La mayor cagada que he cometido haciendo un cabello.',
    'Algo que una clienta me enseñó y nunca olvidé.',
    'Por qué a veces te voy a decir que NO al color que me estás pidiendo.',
    'El trabajo del que más orgulloso estoy y por qué.',
    'Una tendencia de pelo que yo jamás recomendaría.',
    'Algo que hacía cuando empecé y que hoy me parece una locura.',
    'El cambio de look que más miedo me ha dado hacer.',
    'La razón por la que siempre pregunto esto antes de empezar un color.',
    'Lo que pienso cuando una clienta me dice: "Haz lo que quieras".',
    'La parte más difícil de ser peluquero que nadie ve.',
    'Por qué prefiero perder un servicio antes que estropearte el pelo.',
    'Una cosa que me gustaría que todas mis clientas supieran antes de venir.',
    'Lo que más me gusta de ver a una clienta después de un cambio de look.',
    'Después de años trabajando con cabello, esto es lo más importante que he aprendido.',
  ],
}

/** Identificador estable del gancho: `instantaneos-7` etc. */
export function ganchoId(catId: GanchoCategoryId, index: number): string {
  return `${catId}-${index + 1}`
}

export interface GanchoItem {
  id: string
  categoryId: GanchoCategoryId
  index: number // 1-based dentro de su categoría
  text: string
}

/** Lista plana de los 80 ganchos (para contadores, búsquedas, QA). */
export function allGanchos(): GanchoItem[] {
  return GANCHO_CATEGORY_META.flatMap(({ id }) =>
    GANCHOS[id].map((text, i) => ({ id: ganchoId(id, i), categoryId: id, index: i + 1, text }))
  )
}

export function ganchoCategoryName(id: GanchoCategoryId): string {
  return GANCHO_CATEGORY_META.find(c => c.id === id)?.name || id
}