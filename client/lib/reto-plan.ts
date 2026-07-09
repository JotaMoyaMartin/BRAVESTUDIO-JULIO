import { Reto10kConfig, RetoCategory, RetoFrequency, RetoMission, RetoPlanDay } from '@/types/reto10k'

/**
 * Distribución estratégica de fechas para el plan de 30 días del Reto 10K.
 *
 * Reglas (especificación del usuario):
 *  - Priorizar: Martes, Miércoles, Jueves, Domingo.
 *  - Evitar sábado salvo casos concretos.
 *  - No saturar: distribuir en puntos espaciados de la semana.
 */

// Índices JS getDay: 0=Dom,1=Lun,2=Mar,3=Mié,4=Jue,5=Vie,6=Sáb
const PATTERNS: Record<RetoFrequency, number[]> = {
  3: [2, 4, 0], // Martes, Jueves, Domingo
  4: [2, 3, 4, 0], // Martes, Miércoles, Jueves, Domingo
  5: [2, 3, 4, 5, 0], // Martes, Miércoles, Jueves, Viernes, Domingo
  7: [0, 1, 2, 3, 4, 5, 6], // Diario
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Lun..Dom para ordenar

function nextDateWithDay(start: Date, targetDay: number): Date {
  const d = new Date(start)
  const diff = (targetDay - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return d
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Devuelve las fechas (ISO yyyy-mm-dd) para los 30 días del reto,
 * distribuidas según la frecuencia semanal seleccionada.
 * El día 1 del reto SIEMPRE es la fecha de inicio (independientemente del patrón),
 * para que la usuaria tenga una misión hoy. A partir de ahí se aplica el patrón.
 */
export function distributePlanDates(startDate: string, frequency: RetoFrequency): string[] {
  const start = new Date(startDate + 'T00:00:00')
  const dates: string[] = [toISODate(start)] // día 1 = hoy/fecha elegida

  const pattern = PATTERNS[frequency]
  // Para diario, simplemente añadimos días consecutivos
  if (frequency === 7) {
    for (let i = 1; i < 30; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      dates.push(toISODate(d))
    }
    return dates
  }

  // Para frecuencias semanal: iterar semanas, cada semana generar los días del patrón
  let added = 1
  let weekOffset = 0
  while (added < 30) {
    const weekStart = new Date(start)
    weekStart.setDate(weekStart.getDate() + weekOffset * 7)
    // Ordenar los días del patrón de Lun→Dom para que queden bonitos
    const orderedDays = [...pattern].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    for (const dayOfWeek of orderedDays) {
      if (added >= 30) break
      const d = nextDateWithDay(weekStart, dayOfWeek)
      const iso = toISODate(d)
      // Evitar duplicar la fecha de inicio (día 1)
      if (iso === dates[0]) continue
      // Evitar fechas anteriores a la fecha de inicio dentro de la misma primera semana
      if (d.getTime() < start.getTime()) continue
      dates.push(iso)
      added++
    }
    weekOffset++
    if (weekOffset > 20) break // safety
  }

  return dates.slice(0, 30)
}

/**
 * Asigna categorías a los 30 días respetando el balance 40/40/20
 * (autoridad / resultados / conexion) y alineando con la fase de cada día:
 *  - Fase 1 (días 1-8): conexión-heavy (presentación, historia)
 *  - Fase 2 (días 9-15): autoridad
 *  - Fase 3 (días 16-23): resultados
 *  - Fase 4 (días 24-30): mix viral/conexión
 */
export function assignCategoryForDay(day: number, mission: RetoMission): RetoCategory {
  // Si la misión ya sugiere un pilar por su naturaleza, respetarla
  const title = mission.title.toLowerCase()
  const hint = (mission.prompt_hint || '').toLowerCase()

  if (mission.phase === 1) {
    // Presentación, historia, salón → dolor (conectar con la clienta)
    if (/historia|salón|present|profesión|filosof|primera client|única|día en tu vida/.test(title)) {
      return 'dolor'
    }
    return 'dolor'
  }
  if (mission.phase === 2) {
    // Consejos, errores, educación, mitos, opinión → autoridad / educacion
    if (/consejo|error|educación|mito|opinión|preguntas frecuentes|tutorial|paso a paso/.test(title)) {
      return 'educacion'
    }
    return 'autoridad'
  }
  if (mission.phase === 3) {
    // Antes/después, transformaciones, testimonios → deseo (aspiracional)
    if (/antes y después|transformación|caso real|proceso|testimonio|resultado|resumen/.test(title)) {
      return 'deseo'
    }
    return 'deseo'
  }
  // Fase 4: tendencias, viral, opinión, comunidad → mix (viralidad + objecion)
  if (/viral|conversación|comunidad|agradecimiento|celebra/.test(title)) {
    return 'viralidad'
  }
  if (/tendencia|opinión|marca personal/.test(title)) {
    return 'objecion'
  }
  return hint.includes('antes') ? 'deseo' : 'viralidad'
}

/**
 * Construye el plan completo de 30 días combinando fechas distribuidas,
 * misiones (de config) y categorías balanceadas.
 */
export function build30DayPlan(
  config: Reto10kConfig | null,
  startDate: string,
  frequency: RetoFrequency
): RetoPlanDay[] {
  const dates = distributePlanDates(startDate, frequency)
  const missions = config?.missions || []
  const plan: RetoPlanDay[] = []

  for (let i = 0; i < 30; i++) {
    const day = i + 1
    const mission = missions.find(m => m.day === day) || missions[i] || {
      day,
      phase: day <= 8 ? 1 : day <= 15 ? 2 : day <= 23 ? 3 : 4,
      title: `Misión día ${day}`,
      description: 'Misión del reto.',
      prompt_hint: '',
    }
    const category = assignCategoryForDay(day, mission)
    plan.push({ date: dates[i], day, mission, category })
  }

  // Verificar balance entre los 6 pilares y ajustar si se desvía demasiado
  const cats: RetoCategory[] = ['autoridad', 'viralidad', 'educacion', 'deseo', 'dolor', 'objecion']
  const counts: Record<RetoCategory, number> = { autoridad: 0, viralidad: 0, educacion: 0, deseo: 0, dolor: 0, objecion: 0 }
  plan.forEach(p => counts[p.category]++)
  const total = plan.length
  const perPilar = Math.floor(total / cats.length)
  const target: Record<RetoCategory, number> = { autoridad: perPilar, viralidad: perPilar, educacion: perPilar, deseo: perPilar, dolor: perPilar, objecion: perPilar }

  // Solo ajustamos si el desvío es >2 en algún pilar
  const drift = Math.max(...cats.map(c => Math.abs(counts[c] - target[c])))
  if (drift > 2) {
    rebalance(plan, counts, target)
  }

  return plan
}

function rebalance(
  plan: RetoPlanDay[],
  counts: Record<RetoCategory, number>,
  target: Record<RetoCategory, number>
) {
  // Para cada pilar con exceso, cambiar días de ese pilar (preferentemente fase 4)
  // hacia el pilar con déficit
  const cats: RetoCategory[] = ['autoridad', 'viralidad', 'educacion', 'deseo', 'dolor', 'objecion']
  let guard = 0
  while (guard++ < 20) {
    const excess = cats.find(c => counts[c] > target[c] + 1)
    const deficit = cats.find(c => counts[c] < target[c] - 1)
    if (!excess || !deficit) break
    // Buscar un día de fase 4 con la categoría en exceso
    const idx = plan.findIndex(p => p.category === excess && p.mission.phase === 4)
    if (idx === -1) {
      // Si no hay de fase 4, buscar cualquiera en exceso que no sea de su fase natural
      const alt = plan.findIndex(p => p.category === excess)
      if (alt === -1) break
      plan[alt].category = deficit
      counts[excess]--
      counts[deficit]++
      continue
    }
    plan[idx].category = deficit
    counts[excess]--
    counts[deficit]++
  }
}

/**
 * Devuelve la fecha de inicio sugerida según la opción elegida.
 */
export function resolveStartDate(option: 'today' | 'next_week' | string): string {
  const now = new Date()
  if (option === 'today') return toISODate(now)
  if (option === 'next_week') {
    const d = new Date(now)
    d.setDate(d.getDate() + 7)
    return toISODate(d)
  }
  // string ISO date
  return option
}

/**
 * Devuelve el número de día actual del reto basado en started_at.
 */
export function computeCurrentDay(startedAt: string | null): number {
  if (!startedAt) return 1
  const now = Date.now()
  const start = new Date(startedAt).getTime()
  const elapsed = Math.floor((now - start) / 86400000)
  return Math.max(1, Math.min(30, elapsed + 1))
}