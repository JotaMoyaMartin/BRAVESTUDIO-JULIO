// MOCK — datos demo de la sección "Referencias" (para aprobación de Jota).
// Al integrar: tabla real + panel admin; este archivo se elimina.
// Portadas descargadas del embed IG cada 2-oct-2026 (los CDN expiran).

export interface ReelReference {
  id: string
  title: string
  account: string // "@handle"
  accountLabel: string
  followers: string
  cover_image: string
  instagram_url: string
  short_description: string
  steal: string // "Róbale"
  structure: string[] // estructura del reel, del gancho al final
}

export const DEMO_REFERENCES: ReelReference[] = [
  {
    id: 'ref-Dd9la35ATBj',
    title: 'Lo que enseña el street style de Milán',
    account: '@ma.rogat',
    accountLabel: 'Maria Rogat · Imagen Personal',
    followers: '35K',
    cover_image: '/demo-references/ref-Dd9la35ATBj.jpg',
    instagram_url: 'https://www.instagram.com/reel/Dd9la35ATBj/',
    short_description:
      'Mira la calle para enseñar un criterio: combinar colores sin comprar nada nuevo.',
    steal:
      'Observa algo con nombre propio (Milán, una pasarela, un evento) y saca 2-3 reglas aplicables al día siguiente. Todo termina en un "guarda este reel".',
    structure: [
      'Gancho con contexto: "lo que nos está enseñando el street style de Milán"',
      '2-3 combinaciones concretas, cada una demostrada en imagen',
      'Cierre de utilidad: "lo tienes en tu armario" → guarda este reel',
    ],
  },
  {
    id: 'ref-DdgW0COxeb7',
    title: 'Cuando cojo confianza, te vas informado',
    account: '@yisasvillegas',
    accountLabel: 'Villegas · creedor de contenido',
    followers: '131K',
    cover_image: '/demo-references/ref-DdgW0COxeb7.jpg',
    instagram_url: 'https://www.instagram.com/reel/DdgW0COxeb7/',
    short_description:
      'Cuenta una noticia técnica como una confidencia entre amigos, con humor. · 248K views',
    steal:
      'El tono confesional: no "hoy te explico", sino "te vas informando por aquí". La novedad se cuenta como un secreto recién descubierto — hasta un tema frío se escucha entero.',
    structure: [
      'Confidencia personal como gancho',
      'El dato contado como historia: qué pasó y por qué importa',
      'Remate con humor — los comentarios hacen el resto',
    ],
  },
  {
    id: 'ref-DdbfbG7I9Ok',
    title: 'Vídeo friki pero útil',
    account: '@yisasvillegas',
    accountLabel: 'Villegas · creedor de contenido',
    followers: '131K',
    cover_image: '/demo-references/ref-DdbfbG7I9Ok.jpg',
    instagram_url: 'https://www.instagram.com/reel/DdbfbG7I9Ok/',
    short_description:
      'Un truco buscable demostrado en pantalla en menos de un minuto. · 207K views',
    steal:
      'Utilidad pura con sonrisa: "esto es friki pero te ahorra tiempo". La demostración se ve en pantalla, sin rodeos. Es el tipo de reel que se guarda para siempre.',
    structure: [
      'Promesa corta y honesta como caption',
      'Demostración en pantalla, paso a paso, sin intro',
      'Humor que previene la frialdad — se guarda solo',
    ],
  },
  {
    id: 'ref-Ddwgo-lubMn',
    title: 'La cuna de las mentiras',
    account: '@alvarogijon.st',
    accountLabel: 'Álvaro Gijón · Storyteller',
    followers: '307K',
    cover_image: '/demo-references/ref-Ddwgo-lubMn.jpg',
    instagram_url: 'https://www.instagram.com/reel/Ddwgo-lubMn/',
    short_description:
      'Despedidas de aeropuerto: un micro-momento real convertido en emoción universal. · 274K views',
    steal:
      'El caption como titular poético (dos palabras) para una historia emocional: momento real → emoción que todo el mundo ha sentido → frase final que resume la vida. Versión salón: la primera vez que una clienta se corta el pelo largo.',
    structure: [
      'Titular poético de dos palabras como gancho',
      'Micro-momento documentado de la vida real',
      'Frase final universal — los comentarios se alargan',
    ],
  },
  {
    id: 'ref-DdzNB16hEsn',
    title: 'Sin auriculares',
    account: '@alvarogijon.st',
    accountLabel: 'Álvaro Gijón · Storyteller',
    followers: '307K',
    cover_image: '/demo-references/ref-DdzNB16hEsn.jpg',
    instagram_url: 'https://www.instagram.com/reel/DdzNB16hEsn/',
    short_description:
      'Un gesto diario (correr sin música) contado como experiencia sensorial. · 46K views',
    steal:
      'Momento sensorial → cómo se siente → invitación a probarlo. Audio natural, sin música. Versión salón: "la primera vez que sales a la calle sintiéndote otro".',
    structure: [
      'Un gesto cotidiano como gancho (caption minimalista)',
      'El momento sensorial en detalle: qué se oye, qué se nota',
      'Invitación implícita: pruébalo tú también',
    ],
  },
  {
    id: 'ref-Dc_RyxfsgM6',
    title: 'Lo siento por crearte esta necesidad',
    account: '@yisasvillegas',
    accountLabel: 'Villegas · creedor de contenido',
    followers: '131K',
    cover_image: '/demo-references/ref-Dc_RyxfsgM6.jpg',
    instagram_url: 'https://www.instagram.com/reel/Dc_RyxfsgM6/',
    short_description:
      'Un objeto curioso presentado en uso, con humor antes que el link. · 137K views',
    steal:
      'Deseo sin vender: el objeto o producto se muestra EN USO y con humor; los comentarios piden el link solos. Versión salón: un accesorio o técnica mostrada en contexto, no en catálogo.',
    structure: [
      'El objeto en acción desde el primer frame',
      'Humor de auto-broma como caption',
      'Dejar que el deseo hable — el link llega por comentarios',
    ],
  },
]

// Misma ficha pero con la forma exacta de ReelInspiration (para modo demo
// de /inspiracion-reels: la pestaña de inspiración sale poblada, igual que
// verá la estilista con datos reales).
export const DEMO_INSPIRACIONES: {
  id: string
  title: string
  short_description: string
  description: string
  idea_text: string
  why_text: string
  how_text: string
  cover_image: string
  instagram_url: string
  status: string
  created_at: string
}[] = DEMO_REFERENCES.map(r => ({
  id: r.id,
  title: r.title,
  short_description: r.short_description,
  description: r.short_description,
  idea_text: r.structure.map((s, i) => `${i + 1}. ${s}`).join('\n'),
  why_text: r.steal,
  how_text: 'Abre el reel → mira la estructura → escribe tu versión con el Teleprompter antes de grabar.',
  cover_image: r.cover_image,
  instagram_url: r.instagram_url,
  status: 'active',
  created_at: new Date('2026-10-02').toISOString(),
}))