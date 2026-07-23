import { TeamMember, Client, ContentPiece, Notification, User, WeeklyPlanning, PlanningPublication } from './types'

// ════════════════════════════════════════════
// TEAM MEMBERS — solo 4 + admin
// ════════════════════════════════════════════
// Reparto de clientes:
//   Delfino (editor) y Tuani (designer) → todos los clientes
//   Nahir y Geraldine (CMs) → reparten la lista a mitades
const NAHIR_CLIENTS = ['cl-cristina','cl-mayte','cl-ainhoa','cl-carlota','cl-christofer','cl-rasel','cl-angie','cl-jennifer','cl-marta','cl-carmen']
const GERALDINE_CLIENTS = ['cl-eva-raquel','cl-lola','cl-tania','cl-ester','cl-asun','cl-coco','cl-maria-jose','cl-fran','cl-maria-rogat']
const ALL_CLIENT_IDS = [...NAHIR_CLIENTS, ...GERALDINE_CLIENTS]

export const TEAM: TeamMember[] = [
  { id: 'tm-jota',      name: 'Jota',      role: 'admin',    avatar: 'J', color: '#7A1832', clients: [],            status: 'disponible' },
  { id: 'tm-nahir',     name: 'Nahir',     role: 'cm',       avatar: 'N', color: '#A04060', clients: NAHIR_CLIENTS,    status: 'ocupado' },
  { id: 'tm-geraldine', name: 'Geraldine', role: 'cm',       avatar: 'G', color: '#7A1832', clients: GERALDINE_CLIENTS, status: 'disponible' },
  { id: 'tm-delfino',   name: 'Delfino',   role: 'editor',   avatar: 'D', color: '#591427', clients: ALL_CLIENT_IDS,    status: 'disponible' },
  { id: 'tm-tuani',     name: 'Tuani',     role: 'designer', avatar: 'T', color: '#A04060', clients: ALL_CLIENT_IDS,    status: 'ocupado' },
]

// ════════════════════════════════════════════
// USERS (login credentials)
// ════════════════════════════════════════════
export const USERS: User[] = [
  { id: 'u-jota',      email: 'jota@bravecontent.com',      password: 'brave2026', name: 'Jota',      role: 'admin',    memberId: 'tm-jota' },
  { id: 'u-nahir',     email: 'nahir@bravecontent.com',     password: 'brave2026', name: 'Nahir',     role: 'cm',       memberId: 'tm-nahir' },
  { id: 'u-geraldine', email: 'geraldine@bravecontent.com', password: 'brave2026', name: 'Geraldine', role: 'cm',       memberId: 'tm-geraldine' },
  { id: 'u-delfino',   email: 'delfino@bravecontent.com',   password: 'brave2026', name: 'Delfino',   role: 'editor',   memberId: 'tm-delfino' },
  { id: 'u-tuani',     email: 'tuani@bravecontent.com',     password: 'brave2026', name: 'Tuani',     role: 'designer', memberId: 'tm-tuani' },
]

// ════════════════════════════════════════════
// CLIENTS (19)
// ════════════════════════════════════════════
const clientData: [string, string, string, string, { reels: number; carruseles: number }][] = [
  ['cl-cristina',     'Cristina',     'Cristina Peluquería',  'Madrid',         { reels: 4, carruseles: 0 }],
  ['cl-mayte',        'Mayte',        'Salón Mayte',           'Sevilla',        { reels: 2, carruseles: 1 }],
  ['cl-ainhoa',       'Ainhoa',       'Ainhoa Studio',         'Valencia',       { reels: 2, carruseles: 1 }],
  ['cl-carlota',      'Carlota',      'Carlota Hair',          'Barcelona',      { reels: 3, carruseles: 2 }],
  ['cl-christofer',   'Christofer',   'Christofer Barber',     'Málaga',         { reels: 2, carruseles: 1 }],
  ['cl-rasel',        'Rasel',        'Rasel Grooming',        'Granada',        { reels: 2, carruseles: 1 }],
  ['cl-angie',        'Angie',        'Angie Beauty',          'Zaragoza',       { reels: 2, carruseles: 1 }],
  ['cl-jennifer',     'Jennifer',     'Jennifer Salón',        'Bilbao',         { reels: 2, carruseles: 1 }],
  ['cl-marta',        'Marta',        'Marta Estilista',       'Murcia',         { reels: 2, carruseles: 1 }],
  ['cl-carmen',       'Carmen',       'Carmen Hair Studio',    'Palma',          { reels: 2, carruseles: 1 }],
  ['cl-eva-raquel',   'Eva y Raquel', 'Eva & Raquel Salon',    'Alicante',       { reels: 2, carruseles: 1 }],
  ['cl-lola',         'Lola',         'Lola Coiffure',         'Tenerife',       { reels: 2, carruseles: 1 }],
  ['cl-tania',        'Tania',        'Tania Nails & Hair',    'Oviedo',         { reels: 2, carruseles: 1 }],
  ['cl-ester',        'Ester',        'Ester Peluquería',      'Valladolid',     { reels: 2, carruseles: 1 }],
  ['cl-asun',         'Asun',         'Asun Salón',            'Pamplona',       { reels: 2, carruseles: 1 }],
  ['cl-coco',         'Coco',         'Coco Hair Bar',         'San Sebastián',  { reels: 2, carruseles: 1 }],
  ['cl-maria-jose',   'María José',   'MJ Estilismo',          'Logroño',        { reels: 2, carruseles: 1 }],
  ['cl-fran',         'Fran',         'Fran Barber Shop',      'Cádiz',          { reels: 2, carruseles: 1 }],
  ['cl-maria-rogat',  'María Rogat',  'María Rogat Studio',    'Lugo',           { reels: 2, carruseles: 1 }],
]

const colors = ['#7A1832','#A04060','#591427','#C1DBE8','#B8D8B0','#FFF1B5','#A04060','#7A1832']
const services = ['Corte','Color','Balayage','Mechas','Tratamientos','Keratina','Peinados','Maquillaje']
const tones = ['Cercano y profesional','Divertido y fresco','Elegante y exclusivo','Educativo y cercano','Inspirador y motivador']
const objectives = ['Aumentar reservas','Fidelizar clientas','Mostrar transformaciones','Educar sobre cuidado','Aumentar visibilidad']

export const CLIENTS: Client[] = clientData.map(([id, name, salon, city, weeklyLoad], i) => {
  const cm = TEAM.find(t => t.role === 'cm' && t.clients.includes(id)) || null
  const editor = TEAM.find(t => t.role === 'editor' && t.clients.includes(id)) || null
  const designer = TEAM.find(t => t.role === 'designer' && t.clients.includes(id)) || null
  return {
    id, name, salonName: salon, city,
    instagram: `@${name.toLowerCase().replace(/\s+/g,'').replace(/[óòáàéèíìúù]/g, c => ({ó:'o',ò:'o',á:'a',à:'a',é:'e',è:'e',í:'i',ì:'i',ú:'u',ù:'u'})[c]||c)}`,
    logoColor: colors[i % colors.length],
    cmId: cm?.id || null,
    editorId: editor?.id || null,
    designerId: designer?.id || null,
    serviceStatus: i < 14 ? 'activo' : i < 18 ? 'onboarding' : 'pausado',
    mainServices: [services[i % services.length], services[(i+1) % services.length], services[(i+2) % services.length]],
    promoteService: services[(i+3) % services.length],
    tone: tones[i % tones.length],
    objectives: objectives[i % objectives.length],
    postFrequency: `${weeklyLoad.reels + weeklyLoad.carruseles} publicaciones/semana`,
    postDays: ['Martes','Jueves','Domingo'],
    observations: i % 3 === 0 ? 'Clienta muy exigente con la calidad visual. Prefiere estética minimalista.' : i % 3 === 1 ? 'Le gusta involucrarse en la creación de copies. Responde rápido.' : 'Confía plenamente en el equipo. Aprobación automática de contenido educativo.',
    materialFolderUrl: `https://drive.google.com/folder/${id}`,
    weeklyLoad,
  }
})

// Mapeo manual a cuentas premium reales de Supabase (profiles.role = 'premium').
// Solo estas clientas tienen `supabase_user_id` definido — el resto son mock-only.
// Para añadir más, buscar el user_id en profiles.email y asignar aquí.
const PREMIUM_MAPPING: Record<string, string> = {
  'cl-mayte': 'f4592671-afcc-40d2-b239-bc88740b9a0c', // Mayte Garcia · mayte000@hotmail.es
}
CLIENTS.forEach(c => {
  if (PREMIUM_MAPPING[c.id]) c.supabase_user_id = PREMIUM_MAPPING[c.id]
})

// ════════════════════════════════════════════
// CONTENT PIECES — generate for all clients, 4 weeks, July 2026
// ════════════════════════════════════════════
const month = 'Julio 2026'
const slots = ['reel1','reel2','reel3','carrusel1','diseno','copy'] as const
const objectivesList = ['educacion','autoridad','inspiracion','venta','deseo','dolor','objecion','testimonio','caso_exito','viralidad'] as const
const typesList = ['reel_hablado','reel_visual','reel_resultado','carrusel','post','stories','testimonio','anuncio'] as const

const statusFlow: ContentPiece['status'][] = [
  'sin_empezar','pendiente_material','en_proceso','en_edicion','en_diseno',
  'en_revision','cambios_solicitados','aprobado','finalizado','planificado','no_aplica'
]

const themes = [
  'Transformación balayage','Rutina de cuidado en casa','Antes y después corte',
  'Tendencias color 2026','Tutorial peinado fiesta','Errores al lavar el pelo',
  'Reserva tu cita','Testimonio clienta','Mitos del keratina','Consejos para verano',
  'Técnica de mechas','Preparación para evento','Cambio de look completo','Cuidado del cuero cabelludo',
]

const hooks = [
  'Si todavía no has probado esto...','El cambio que tu clienta no espera','Esto pasa cuando usas el producto equivocado',
  'Nadie te cuenta esta técnica','El secreto detrás de un buen balayage','Tu clienta volverá si haces esto',
]

function pick<T>(arr: readonly T[], seed: number): T { return arr[seed % arr.length] }

let pieceId = 0
export const CONTENT: ContentPiece[] = []

CLIENTS.forEach((client, ci) => {
  for (let week = 1; week <= 4; week++) {
    slots.forEach((slot, si) => {
      const seed = ci * 100 + week * 10 + si
      const status = pick(statusFlow, seed + week)
      // Later weeks are less complete
      const actualStatus = week >= 3 && ci % 2 === 0 ? pick(['en_proceso','en_edicion','pendiente_material','sin_empezar'] as const, seed) : status
      // Week 4 mostly unstarted
      const finalStatus: ContentPiece['status'] = week === 4 ? pick(['sin_empezar','pendiente_material','en_proceso'] as const, seed) : actualStatus

      const type = slot.startsWith('reel') ? pick(['reel_hablado','reel_visual','reel_resultado'] as const, seed) : slot === 'carrusel1' ? 'carrusel' : slot === 'diseno' ? 'post' : 'stories'
      const dueDate = new Date(2026, 6, week * 7 + si).toISOString()

      CONTENT.push({
        id: `cp-${pieceId++}`,
        clientId: client.id,
        week,
        month,
        slot,
        type: type as ContentPiece['type'],
        title: `${pick(themes, seed)} — ${client.name}`,
        objective: pick(objectivesList, seed) as ContentPiece['objective'],
        theme: pick(themes, seed),
        hook: pick(hooks, seed),
        script: `Guion para ${pick(themes, seed)}. Gancho: ${pick(hooks, seed)}. Desarrollo: explicar el valor del servicio. CTA: reserva tu cita.`,
        copy: `¡Nuevo contenido! ${pick(themes, seed)} 💇‍♀️ Reserva tu cita en el link de la bio.`,
        cta: 'Reserva tu cita',
        status: finalStatus,
        editorId: client.editorId,
        designerId: client.designerId,
        cmId: client.cmId,
        rawMaterialUrl: finalStatus === 'pendiente_material' || finalStatus === 'sin_empezar' ? null : `https://drive.google.com/raw/${pieceId}`,
        finalUrl: ['finalizado','planificado','aprobado'].includes(finalStatus) ? `https://drive.google.com/final/${pieceId}` : null,
        coverUrl: ['finalizado','planificado','aprobado','en_revision'].includes(finalStatus) ? `https://placehold.co/400x500/${client.logoColor.replace('#','')}/fff?text=${client.name}` : null,
        comments: finalStatus === 'cambios_solicitados' ? [{ id: 'c1', authorId: client.cmId || 'tm-nahir', text: 'Revisar el color del título, pedir más contraste.', createdAt: new Date(2026, 6, 15).toISOString() }] : [],
        dueDate,
        priority: week <= 2 ? 'alta' : week === 3 ? 'media' : 'baja',
        createdAt: new Date(2026, 6, 1).toISOString(),
        updatedAt: new Date(2026, 6, 10 + week).toISOString(),
      })
    })
  }
})

// ════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════
export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'upload', message: 'Delfino ha subido el Reel 2 de Cristina', clientId: 'cl-cristina', createdAt: new Date(2026, 6, 17, 10, 30).toISOString(), read: false },
  { id: 'n2', type: 'change', message: 'Nahir ha solicitado cambios en el carrusel de Lola', clientId: 'cl-lola', createdAt: new Date(2026, 6, 17, 9, 15).toISOString(), read: false },
  { id: 'n3', type: 'review', message: 'La planificación de Marta está lista para revisar', clientId: 'cl-marta', createdAt: new Date(2026, 6, 16, 18, 0).toISOString(), read: false },
  { id: 'n4', type: 'approval', message: 'Jennifer ha aprobado su planificación', clientId: 'cl-jennifer', createdAt: new Date(2026, 6, 16, 15, 30).toISOString(), read: true },
  { id: 'n5', type: 'material', message: 'Falta material bruto de Carlota', clientId: 'cl-carlota', createdAt: new Date(2026, 6, 16, 12, 0).toISOString(), read: false },
  { id: 'n6', type: 'deadline', message: 'La entrega de Rasel vence mañana', clientId: 'cl-rasel', createdAt: new Date(2026, 6, 17, 8, 0).toISOString(), read: false },
  { id: 'n7', type: 'upload', message: 'Tuani ha subido el diseño de Jennifer', clientId: 'cl-jennifer', createdAt: new Date(2026, 6, 15, 17, 45).toISOString(), read: true },
  { id: 'n8', type: 'review', message: 'El Reel 1 de Mayte está listo para revisión', clientId: 'cl-mayte', createdAt: new Date(2026, 6, 15, 14, 20).toISOString(), read: true },
]

// ════════════════════════════════════════════
// WEEKLY PLANNINGS — collaborative workspace
// ════════════════════════════════════════════
export const PLANNINGS: WeeklyPlanning[] = []

// Generate plannings for ALL clients, weeks 1-2, using each client's weeklyLoad
// (Cristina: 4 reels · Carlota: 3 reels + 2 carruseles · resto: 2 reels + 1 carrusel)
CLIENTS.forEach(client => {
  for (let week = 1; week <= 2; week++) {
    const structure: ('reel' | 'carrusel')[] = [
      ...Array.from({ length: client.weeklyLoad.reels }, () => 'reel' as const),
      ...Array.from({ length: client.weeklyLoad.carruseles }, () => 'carrusel' as const),
    ]
    if (structure.length === 0) continue
    const pubs: PlanningPublication[] = structure.map((type, i) => {
      const isReel = type === 'reel'
      const authorId = isReel ? client.editorId : client.designerId
      const baseCover = `https://placehold.co/400x500/${client.logoColor.replace('#','')}/fff?text=${client.name}+${i+1}`
      // Week 2: leave some publications empty so the team has things to fill in
      const isDraft = week === 2 && i >= Math.ceil(structure.length / 2)
      return {
        id: `pub-${client.id}-${week}-${i}`,
        type,
        title: isDraft ? 'Nueva publicación' : `${pick(themes, client.id.length + week * 10 + i)} — ${client.name}`,
        coverUrl: isDraft ? null : (isReel ? baseCover : null),
        coverAlternatives: [],
        carouselImages: isDraft ? [] : (isReel ? [] : Array.from({ length: 4 }, (_, k) =>
          `https://placehold.co/400x500/${client.logoColor.replace('#','')}/fff?text=${client.name}+${k+1}`
        )),
        copy: isDraft ? '' : `¡Nuevo contenido! ${pick(themes, client.id.length + week * 10 + i)} 💇‍♀️ Reserva tu cita en el link de la bio.`,
        driveLink: isDraft ? null : (isReel ? `https://drive.google.com/final/${client.id}-${week}-${i}` : null),
        day: client.postDays[i % client.postDays.length] || null,
        time: ['12:00','18:00','20:00','10:00','16:00'][i % 5] || '12:00',
        order: i,
        authorId: authorId || null,
        markedReadyById: null,
        markedReadyAt: null,
        blockedNoMaterial: false,
        blockedReason: null,
      }
    })

    PLANNINGS.push({
      id: `pl-${client.id}-${week}`,
      clientId: client.id,
      week,
      month,
      status: week === 1
        ? (client.id === 'cl-jennifer' ? 'aprobada' : client.id === 'cl-cristina' ? 'enviada' : 'lista_revision')
        : 'borrador',
      publications: pubs,
      shareToken: null,
      clientComment: client.id === 'cl-cristina' ? 'Perfecto, solo cambiar el copy del jueves.' : '',
      createdAt: new Date(2026, 6, week * 5).toISOString(),
      updatedAt: new Date(2026, 6, week * 7).toISOString(),
    })
  }
})

// ════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════
export const STATUS_CONFIG: Record<ContentPiece['status'], { label: string; color: string; bg: string; dot: string }> = {
  sin_empezar:       { label: 'Sin empezar',         color: '#6b6b6b', bg: '#f4f3f1', dot: '#6b6b6b' },
  pendiente_material:{ label: 'Pendiente material',  color: '#e03131', bg: '#FFF5F5', dot: '#e03131' },
  en_proceso:        { label: 'En proceso',          color: '#f08c00', bg: '#FFF9DB', dot: '#f08c00' },
  en_edicion:        { label: 'En edición',          color: '#0c8599', bg: '#E3FAFC', dot: '#0c8599' },
  en_diseno:         { label: 'En diseño',           color: '#e8590c', bg: '#FFF4ED', dot: '#e8590c' },
  en_revision:       { label: 'En revisión',         color: '#1971c2', bg: '#E7F5FF', dot: '#1971c2' },
  cambios_solicitados:{ label: 'Cambios solicitados', color: '#e03131', bg: '#FFF5F5', dot: '#e03131' },
  aprobado:          { label: 'Aprobado',            color: '#2f9e44', bg: '#EBFBEE', dot: '#2f9e44' },
  finalizado:        { label: 'Finalizado',          color: '#2f9e44', bg: '#D3F9D8', dot: '#2f9e44' },
  planificado:       { label: 'Planificado',         color: '#9c36b5', bg: '#F8F0FC', dot: '#9c36b5' },
  no_aplica:         { label: 'N/A',                 color: '#adb5bd', bg: '#f8f9fa', dot: '#adb5bd' },
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  cm: 'Community Manager',
  editor: 'Editor de vídeo',
  designer: 'Diseñadora gráfica',
}

export const SLOT_LABELS: Record<string, string> = {
  reel1: 'Reel 1',
  reel2: 'Reel 2',
  reel3: 'Reel 3',
  carrusel1: 'Carrusel 1',
  diseno: 'Diseño gráfico',
  copy: 'Copy',
  stories: 'Stories',
}

export const TYPE_LABELS: Record<string, string> = {
  reel_hablado: 'Reel hablado',
  reel_visual: 'Reel visual',
  reel_resultado: 'Reel resultado',
  carrusel: 'Carrusel',
  post: 'Post',
  stories: 'Stories',
  testimonio: 'Testimonio',
  anuncio: 'Anuncio',
}

export const OBJECTIVE_LABELS: Record<string, string> = {
  educacion: 'Educación',
  autoridad: 'Autoridad',
  inspiracion: 'Inspiración',
  venta: 'Venta',
  deseo: 'Deseo',
  dolor: 'Dolor',
  objecion: 'Objeción',
  testimonio: 'Testimonio',
  caso_exito: 'Caso de éxito',
  viralidad: 'Viralidad',
}