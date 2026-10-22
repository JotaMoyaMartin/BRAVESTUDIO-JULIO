/**
 * STORIES — estándar BRÄVE de secuencias (21-oct-2026).
 *
 * Reglas del estándar:
 *  - Máximo 3 stories por secuencia. Cada story dice UNA cosa.
 *  - Texto en pantalla corto: idealmente ≤ 22 palabras (se lee en 3–4 s).
 *  - Cada secuencia tiene un objetivo claro y termina con una acción
 *    conversacional (escribir, reservar, responder), nunca «comenta PALABRA».
 *  - Encuestas y preguntas se añaden en Instagram (desde aquí no se pueden
 *    incrustar): la app indica cuál y con qué opciones.
 */
import type { SingleStory } from '@/lib/ai/prompts/stories'

export type SequenceType = 'vender' | 'caso' | 'huecos' | 'confianza' | 'interaccion'

export interface SequenceTypeDef {
  id: SequenceType
  name: string
  /** Para qué sirve, en una frase de estilista. */
  goal: string
  /** Bloques en orden (= número de stories). */
  beats: Array<{ role: string; guide: string }>
}

export const SEQUENCE_TYPES: SequenceTypeDef[] = [
  {
    id: 'vender',
    name: 'Vender un servicio',
    goal: 'Que te pidan cita para un servicio concreto',
    beats: [
      { role: 'Problema', guide: 'Una duda o problema real de la clienta, sin resolverlo todavía.' },
      { role: 'Tu proceso', guide: 'Qué haces distinto: qué, cómo y por qué, en dos frases.' },
      { role: 'Resultado + acción', guide: 'El beneficio que se ve y la invitación a escribirte.' },
    ],
  },
  {
    id: 'caso',
    name: 'Caso real de hoy',
    goal: 'Demostrar con una clienta real que sabes resolverlo',
    beats: [
      { role: 'Cómo llegó', guide: 'La situación de partida y lo que ella quería.' },
      { role: 'Qué hice', guide: 'La decisión profesional que lo cambió todo.' },
      { role: 'Cómo se fue', guide: 'El resultado y la invitación para quien esté igual.' },
    ],
  },
  {
    id: 'huecos',
    name: 'Huecos libres',
    goal: 'Llenar la agenda de esta semana sin rebajar precios',
    beats: [
      { role: 'El hueco', guide: 'Qué día y qué servicio, claro y directo.' },
      { role: 'Para quién es', guide: 'A quién le viene perfecto ese hueco.' },
      { role: 'Cómo reservar', guide: 'Qué tiene que hacer y hasta cuándo.' },
    ],
  },
  {
    id: 'confianza',
    name: 'Confianza',
    goal: 'Que te conozcan y quieran sentarse en tu silla',
    beats: [
      { role: 'Tu salón', guide: 'Un momento real del día a día o de tu forma de recibir.' },
      { role: 'Cómo trabajas', guide: 'El detalle que te diferencia y por qué lo haces.' },
      { role: 'Cercanía', guide: 'Una invitación cálida: escríbeme, ven a conocernos.' },
    ],
  },
  {
    id: 'interaccion',
    name: 'Interacción',
    goal: 'Que te respondan y abrir conversaciones',
    beats: [
      { role: 'Encuesta', guide: 'Una pregunta fácil de responder con un toque.' },
      { role: 'Tu respuesta experta', guide: 'Lo que contestarías como profesional.' },
      { role: 'Invitación', guide: 'Ofrece ayuda personal por mensaje.' },
    ],
  },
]

export function sequenceType(id: string | undefined): SequenceTypeDef {
  return SEQUENCE_TYPES.find(t => t.id === id) || SEQUENCE_TYPES[0]
}

export const SEQUENCE_SERVICES = ['Balayage', 'Rubios', 'Canas', 'Color', 'Corte', 'Tratamientos'] as const
export type SequenceService = typeof SEQUENCE_SERVICES[number]

export interface ReadyStory {
  text: string
  /** Qué foto o clip poner detrás. */
  visual: string
  /** Encuesta para añadir en Instagram (opcional). */
  poll?: { label: string; options: [string, string] }
}

export interface ReadySequence {
  id: string
  type: SequenceType
  service: SequenceService
  title: string
  stories: ReadyStory[]
}

const S = (type: SequenceType, service: SequenceService, title: string, stories: ReadyStory[]): ReadySequence => ({
  id: `${type}-${service.toLowerCase()}`,
  type,
  service,
  title,
  stories,
})

export const READY_SEQUENCES: ReadySequence[] = [
  // ─── VENDER UN SERVICIO ───────────────────────────────────────────────
  S('vender', 'Balayage', 'Balayage que crece bonito', [
    { text: '¿Tu balayage se ve bien la primera semana y luego parece una raíz?', visual: 'Foto de una raíz marcada o tú mirando a cámara con cara de «esto pasa mucho».', poll: { label: '¿Te ha pasado?', options: ['Sí, siempre', 'No, nunca'] } },
    { text: 'Yo lo planifico para que crezca: difumino la raíz y elijo el tono según tu base. Así no dependes del salón cada mes.', visual: 'Clip de tus manos pintando mechas o del papel en el pelo.' },
    { text: 'Resultado: luz natural que sigue bonita a los 3 meses. Si quieres el tuyo, escríbeme y miramos tu caso.', visual: 'Clip del resultado en movimiento, con luz de ventana.' },
  ]),
  S('vender', 'Rubios', 'Rubio sin amarillo', [
    { text: 'Si tu rubio se vuelve amarillo a las pocas semanas, no es culpa tuya.', visual: 'Foto de un rubio con reflejo amarillo o tú tocándote el pelo.' },
    { text: 'Aclaro con calma para cuidar la fibra, matizo en el salón y te digo qué usar en casa para que dure frío.', visual: 'Clip del matiz en el lavacabezas o del producto que recomiendas.' },
    { text: 'Un rubio limpio y brillante que dura. ¿Lo quieres? Escríbeme y te cuento cómo lo haríamos en tu pelo.', visual: 'Clip del rubio final al sol o junto a la ventana.' },
  ]),
  S('vender', 'Canas', 'Canas sin línea marcada', [
    { text: '¿Te tiñes las canas y a las dos semanas ya ves la línea blanca?', visual: 'Foto de una raíz con canas o tú señalando la raíz.', poll: { label: '¿A ti también?', options: ['Sí, enseguida', 'Aguanto bien'] } },
    { text: 'Hay otra opción: integrarlas con mechas finas o un color más suave. Crecen sin línea y espacias las citas.', visual: 'Clip del proceso o de las mechas finas en la raíz.' },
    { text: 'Menos esclava del tinte y un resultado natural. Escríbeme y vemos qué te encaja según tu pelo.', visual: 'Resultado con canas integradas, en movimiento.' },
  ]),
  S('vender', 'Color', 'Un color que no se apaga', [
    { text: 'Si tu color se apaga a las tres semanas, hay algo que se puede hacer distinto.', visual: 'Foto de un color sin brillo o tú mirando a cámara.' },
    { text: 'Antes de teñir miro tu historial y el estado del pelo. Elijo la fórmula para que el color se quede, no solo para que salga bonito hoy.', visual: 'Clip de la mezcla del color o del diagnóstico con la clienta.' },
    { text: 'Color con brillo que aguanta. Si quieres renovar el tuyo, escríbeme y te asesoro.', visual: 'Clip del color final con brillo.' },
  ]),
  S('vender', 'Corte', 'El corte que te favorece', [
    { text: '¿Te cortas el pelo de la foto de Pinterest y luego no te ves igual?', visual: 'Tú con una foto de Pinterest en el móvil.', poll: { label: '¿Te ha pasado?', options: ['Sí', 'Nunca'] } },
    { text: 'Antes de cortar miro tu rostro, cómo cae tu pelo y cómo te peinas en casa. El corte se adapta a ti, no al revés.', visual: 'Clip midiendo o peinando a la clienta antes de cortar.' },
    { text: 'Un corte que te queda bien también cuando te peinas tú. Escríbeme y buscamos el tuyo.', visual: 'Clip del corte final moviéndose.' },
  ]),
  S('vender', 'Tratamientos', 'Pelo con brillo de verdad', [
    { text: 'Si tu pelo está áspero y sin brillo aunque uses buena mascarilla, el problema puede estar dentro de la fibra.', visual: 'Foto de puntas secas o tú tocando un pelo encrespado.' },
    { text: 'Primero diagnostico qué le falta (hidratación o reparación) y elijo el tratamiento para eso. No todos los pelos necesitan lo mismo.', visual: 'Clip aplicando el tratamiento o del producto.' },
    { text: 'Suave, con brillo y fácil de peinar. Escríbeme y te digo qué tratamiento necesita tu pelo.', visual: 'Clip del pelo suelto con brillo.' },
  ]),

  // ─── CASO REAL DE HOY ─────────────────────────────────────────────────
  S('caso', 'Balayage', 'De oscuro a luminoso', [
    { text: 'Hoy vino una clienta con el pelo muy oscuro y una idea clara: quería luz, pero sin parecer otra persona.', visual: 'Foto del antes (pide permiso) o de la clienta en el sillón de espaldas.' },
    { text: 'No aclaré todo: elegí mechas finas cerca de la cara y respeté su base. Así la luz se ve natural.', visual: 'Clip de las mechas en el papel o del proceso.' },
    { text: 'Se fue encantada y con un color fácil de mantener. ¿Quieres algo así? Escríbeme.', visual: 'Clip del después, con la clienta moviendo el pelo.' },
  ]),
  S('caso', 'Rubios', 'Rescate de un rubio', [
    { text: 'Hoy llegó una clienta con un rubio amarillo y el pelo sensibilizado de decoloraciones anteriores.', visual: 'Foto del antes o de las puntas.' },
    { text: 'No volví a decolorar. Matizamos y trabajamos un tratamiento para recuperar la fibra. A veces lo mejor es no forzar.', visual: 'Clip del matiz o del tratamiento.' },
    { text: 'Rubio limpio y un pelo que vuelve a estar sano. Si tu rubio necesita ayuda, escríbeme.', visual: 'Clip del rubio final.' },
  ]),
  S('caso', 'Canas', 'Dejar de esconder las canas', [
    { text: 'Hoy vino una clienta cansada de teñirse cada tres semanas para esconder sus canas.', visual: 'Foto de la raíz o de la clienta en el sillón.' },
    { text: 'Le propuse integrarlas con mechas finas en lugar de taparlas. El cambio es suave y el crecimiento ya no se nota.', visual: 'Clip del proceso de las mechas.' },
    { text: 'Sale más libre y más luminosa. Si estás en ese punto, escríbeme y lo hablamos.', visual: 'Clip del resultado con la clienta sonriendo.' },
  ]),
  S('caso', 'Color', 'Corrección de color', [
    { text: 'Hoy tocó corregir un color de caja: manchas, raíz de otro tono y puntas oscuras.', visual: 'Foto del antes o del pelo con manchas.' },
    { text: 'Fuimos por partes para igualar sin dañar: primero limpiar, luego unificar el tono. Con paciencia se consigue.', visual: 'Clip del proceso por secciones.' },
    { text: 'Color uniforme y con brillo. Si te has teñido en casa y no sabes cómo arreglarlo, escríbeme.', visual: 'Clip del color final.' },
  ]),
  S('caso', 'Corte', 'Un cambio que se atrevió', [
    { text: 'Hoy una clienta me dijo: «llevo años con el mismo corte y quiero cambiar, pero me da miedo».', visual: 'Clienta en el sillón antes del corte.' },
    { text: 'Buscamos un cambio que encajara con su rostro y con cómo se peina en casa. Cortamos con calma, por pasos.', visual: 'Clip cortando o de mechones cayendo.' },
    { text: 'Se miró al espejo y dijo «esta soy yo». ¿Te apetece un cambio así? Escríbeme.', visual: 'Clip de la reacción frente al espejo.' },
  ]),
  S('caso', 'Tratamientos', 'Del encrespado al brillo', [
    { text: 'Hoy vino una clienta con el pelo encrespado y sin brillo: «haga lo que haga, no hay manera».', visual: 'Foto del antes o de las puntas.' },
    { text: 'Después del diagnóstico vimos que le faltaba hidratación, no reparación. Elegimos el tratamiento para eso.', visual: 'Clip aplicando el tratamiento.' },
    { text: 'Pelo suave y manejable desde el primer día. Si te pasa lo mismo, escríbeme y miramos tu caso.', visual: 'Clip del pelo con brillo.' },
  ]),

  // ─── HUECOS LIBRES ────────────────────────────────────────────────────
  S('huecos', 'Balayage', 'Hueco para balayage', [
    { text: 'Me queda un hueco esta semana para balayage. Lo dejo aquí antes de que vuele.', visual: 'Foto de tu agenda o del salón vacío esperando.' },
    { text: 'Ideal si llevas tiempo queriendo luz en tu pelo o tu balayage ya pide un repaso.', visual: 'Foto o clip de un balayage tuyo reciente.' },
    { text: 'Escríbeme por mensaje y te lo reservo. Lo doy por orden de llegada.', visual: 'Tú sonriendo a cámara o la puerta del salón.' },
  ]),
  S('huecos', 'Rubios', 'Hueco para rubio', [
    { text: 'Tengo un hueco esta semana para rubios y matiz.', visual: 'Foto de tu agenda o de tu tocador preparado.' },
    { text: 'Perfecto si tu rubio se ha vuelto amarillo o necesitas un repaso antes de un evento.', visual: 'Clip de un rubio recién matizado.' },
    { text: 'Escríbeme y te lo guardo. Primero en escribir, primero en sentarse.', visual: 'Tú a cámara o el salón preparado.' },
  ]),
  S('huecos', 'Canas', 'Hueco para canas', [
    { text: 'Esta semana me queda un hueco para color de canas.', visual: 'Foto de tu agenda.' },
    { text: 'Para ti si ya ves la raíz o quieres probar a integrarlas en vez de taparlas.', visual: 'Clip de un resultado con canas integradas.' },
    { text: 'Escríbeme por mensaje y te digo qué día es. Lo reservo a la primera que me escriba.', visual: 'Tú a cámara o el salón.' },
  ]),
  S('huecos', 'Color', 'Hueco para color', [
    { text: 'Se me ha liberado un hueco para color esta semana.', visual: 'Foto de la agenda o del carrito de color.' },
    { text: 'Ideal si tu color está apagado o quieres un cambio de tono antes del fin de semana.', visual: 'Clip de un color con brillo.' },
    { text: 'Escríbeme y es tuyo. Te confirmo hora por mensaje.', visual: 'Tú a cámara.' },
  ]),
  S('huecos', 'Corte', 'Hueco para corte', [
    { text: 'Tengo un hueco para corte esta semana.', visual: 'Foto de las tijeras o de la agenda.' },
    { text: 'Para ti si notas las puntas abiertas o llevas tiempo queriendo un cambio.', visual: 'Clip de un corte reciente.' },
    { text: 'Escríbeme por mensaje y te lo reservo.', visual: 'Tú a cámara o tu sillón preparado.' },
  ]),
  S('huecos', 'Tratamientos', 'Hueco para tratamiento', [
    { text: 'Me queda un hueco para tratamiento esta semana.', visual: 'Foto del lavacabezas o del producto.' },
    { text: 'Ideal si tienes el pelo seco, encrespado o sin brillo y quieres notarlo desde el primer día.', visual: 'Clip de un pelo con brillo tras el tratamiento.' },
    { text: 'Escríbeme y te lo guardo. Va por orden de llegada.', visual: 'Tú a cámara.' },
  ]),

  // ─── CONFIANZA ────────────────────────────────────────────────────────
  S('confianza', 'Balayage', 'Así empieza un balayage aquí', [
    { text: 'Así empieza cada balayage en mi salón: con un café y diez minutos de charla.', visual: 'Clip de la clienta con un café o de la consulta.' },
    { text: 'Te pregunto cómo te peinas, cada cuánto puedes venir y qué te gusta de tu pelo. El color se diseña para tu vida, no para la foto.', visual: 'Clip de tú enseñando referencias o mirando el pelo.' },
    { text: 'Si te apetece venir a conocerme, escríbeme. Sin compromiso.', visual: 'Tú sonriendo en tu sillón.' },
  ]),
  S('confianza', 'Rubios', 'Mi forma de cuidar un rubio', [
    { text: 'Hay algo que hago con todos los rubios aunque no se vea en la foto final.', visual: 'Clip de tus manos preparando la mezcla.' },
    { text: 'Protejo la fibra durante todo el proceso y, si hace falta, paro antes. Prefiero dos citas a un pelo roto.', visual: 'Clip del tratamiento protector o del lavacabezas.' },
    { text: 'Así trabajo yo. Si buscas alguien que cuide tu rubio, escríbeme.', visual: 'Tú a cámara.' },
  ]),
  S('confianza', 'Canas', 'Sin juicios en el sillón', [
    { text: 'En mi sillón nadie tiene que esconder sus canas.', visual: 'Foto bonita de tu sillón o de tu salón con luz.' },
    { text: 'Hay quien quiere taparlas, quien quiere integrarlas y quien quiere lucirlas. Te escucho y te explico cada opción.', visual: 'Clip de una conversación con una clienta.' },
    { text: 'Tú decides y yo te acompaño. Escríbeme si quieres hablarlo.', visual: 'Tú a cámara.' },
  ]),
  S('confianza', 'Color', 'Lo que no se ve del color', [
    { text: 'Lo que no ves de un color: la parte que más tiempo me lleva.', visual: 'Clip del carrito de color o de la báscula de mezcla.' },
    { text: 'Peso cada fórmula y apunto lo que uso contigo. Así la próxima vez el resultado es el mismo o mejor.', visual: 'Clip pesando el color o de tu ficha de clienta.' },
    { text: 'Por eso mis clientas repiten. Si quieres probar, escríbeme.', visual: 'Tú a cámara o una clienta contenta.' },
  ]),
  S('confianza', 'Corte', 'Un corte sin prisas', [
    { text: 'En mi salón un corte nunca empieza con las tijeras.', visual: 'Clip de tus tijeras sobre el tocador.' },
    { text: 'Primero miro cómo cae tu pelo en seco y cómo lo llevas a diario. Así el corte funciona también en casa.', visual: 'Clip mirando el pelo seco de la clienta.' },
    { text: 'Si quieres un corte pensado para ti, escríbeme y buscamos hueco.', visual: 'Tú a cámara.' },
  ]),
  S('confianza', 'Tratamientos', 'Tu momento en el lavacabezas', [
    { text: 'Para muchas clientas este es su momento favorito de la semana.', visual: 'Clip del lavacabezas con luz suave.' },
    { text: 'Masaje, producto elegido para tu pelo y cero prisas. Cuidarte también es parte del resultado.', visual: 'Clip del masaje o de la espuma.' },
    { text: 'Si necesitas desconectar y cuidar tu pelo, escríbeme y te reservo.', visual: 'Tú sonriendo a cámara.' },
  ]),

  // ─── INTERACCIÓN ──────────────────────────────────────────────────────
  S('interaccion', 'Balayage', '¿Balayage o mechas?', [
    { text: '¿Sabrías decir la diferencia entre balayage y mechas?', visual: 'Foto de dos resultados o tú con cara de pregunta.', poll: { label: '¿Sabes la diferencia?', options: ['Sí', 'Ni idea'] } },
    { text: 'Las mechas van desde la raíz y se notan más. El balayage se pinta a mano y crece sin línea. Son resultados distintos.', visual: 'Clip pintando a mano o comparando dos fotos.' },
    { text: '¿Dudas cuál te va mejor? Escríbeme y te lo digo según tu pelo.', visual: 'Tú a cámara.' },
  ]),
  S('interaccion', 'Rubios', '¿Champú violeta sí o no?', [
    { text: '¿Usas champú violeta en tu rubio?', visual: 'Foto de un champú violeta o del baño.', poll: { label: '¿Lo usas?', options: ['Sí, cada día', 'No'] } },
    { text: 'Úsalo una o dos veces por semana, no a diario: si te pasas, apaga el rubio y lo deja grisáceo.', visual: 'Clip aplicando el champú.' },
    { text: '¿Quieres saber cuál te conviene? Escríbeme y te lo recomiendo.', visual: 'Tú a cámara.' },
  ]),
  S('interaccion', 'Canas', '¿Taparlas o lucirlas?', [
    { text: 'Pregunta sincera: tus canas, ¿taparlas o lucirlas?', visual: 'Tú a cámara o foto de una melena con canas.', poll: { label: 'Tus canas…', options: ['Taparlas', 'Lucirlas'] } },
    { text: 'Las dos opciones valen. Hay un punto intermedio que gusta mucho: integrarlas para que crezcan sin línea.', visual: 'Clip de un resultado con canas integradas.' },
    { text: 'Si no sabes cuál es la tuya, escríbeme y lo vemos juntas.', visual: 'Tú a cámara.' },
  ]),
  S('interaccion', 'Color', '¿Cálido o frío?', [
    { text: '¿Eres más de tonos cálidos o fríos en el pelo?', visual: 'Foto de dos tonos, uno cálido y uno frío.', poll: { label: 'Tú eres…', options: ['Cálido', 'Frío'] } },
    { text: 'Truco: mira las venas de tu muñeca. Si se ven verdes, te favorecen los cálidos; si se ven azules, los fríos.', visual: 'Clip de tu muñeca o de la de una clienta.' },
    { text: '¿Quieres que te diga tu tono ideal? Escríbeme una foto y te asesoro.', visual: 'Tú a cámara.' },
  ]),
  S('interaccion', 'Corte', '¿Cada cuánto cortas?', [
    { text: '¿Cada cuánto te cortas las puntas?', visual: 'Foto de unas tijeras o de puntas abiertas.', poll: { label: 'Me corto…', options: ['Cada 2–3 meses', 'Cuando me acuerdo'] } },
    { text: 'Si quieres que crezca sano, sanear cada 2 o 3 meses evita que la punta abierta suba y tengas que cortar más.', visual: 'Clip saneando puntas.' },
    { text: '¿Toca ya? Escríbeme y te busco hueco.', visual: 'Tú a cámara.' },
  ]),
  S('interaccion', 'Tratamientos', '¿Mascarilla antes o después?', [
    { text: '¿La mascarilla va antes o después del acondicionador?', visual: 'Foto de tus productos en el baño.', poll: { label: '¿Qué crees?', options: ['Antes', 'Después'] } },
    { text: 'Después del champú y en lugar del acondicionador, de medios a puntas y unos minutos. No hace falta usar las dos.', visual: 'Clip aplicando la mascarilla en medios y puntas.' },
    { text: '¿No sabes cuál es la tuya? Escríbeme y te digo cuál necesita tu pelo.', visual: 'Tú a cámara.' },
  ]),
]

/** Convierte una secuencia lista al formato del editor de diseño y la vista. */
export function readyToStories(seq: ReadySequence): SingleStory[] {
  const def = sequenceType(seq.type)
  return seq.stories.map((st, i) => ({
    number: i + 1,
    role: def.beats[i]?.role || `Story ${i + 1}`,
    text: st.text,
    stickerSuggestion: st.poll ? `Encuesta en Instagram: «${st.poll.label}» (${st.poll.options.join(' / ')})` : '',
    sticker: st.poll ? { type: 'poll', label: st.poll.label, options: [...st.poll.options] } : undefined,
    visualIdea: st.visual,
  }))
}
