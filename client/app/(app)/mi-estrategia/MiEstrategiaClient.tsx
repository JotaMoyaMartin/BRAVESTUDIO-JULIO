'use client'
import { useState } from 'react'
import { StrategyDocument } from '@/lib/strategy-types'
import { Roadmap, RoadmapPhase } from '@/lib/roadmap-types'
import { StrategyDisplay } from '@/components/mi-marca/StrategyDisplay'
import { RoadmapDisplay } from '@/components/mi-marca/RoadmapDisplay'
import BraviGuide from '@/components/bravi/BraviGuide'
import { createClient } from '@/lib/supabase/client'

interface Props {
  strategy: StrategyDocument | null
  roadmap: Roadmap | null
}

export default function MiEstrategiaClient({ strategy: initialStrategy, roadmap: initialRoadmap }: Props) {
  const [strategy] = useState<StrategyDocument | null>(initialStrategy)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(initialRoadmap)

  function recomputeStatus(phase: RoadmapPhase): RoadmapPhase['status'] {
    const total = phase.tasks.length
    const done = phase.tasks.filter(t => t.done).length
    if (total > 0 && done === total) return 'completed'
    if (done > 0) return 'in_progress'
    return phase.status === 'completed' ? 'in_progress' : 'pending'
  }

  async function toggleRoadmapTask(phaseIndex: number, taskId: string) {
    if (!roadmap) return
    const next: Roadmap = {
      ...roadmap,
      phases: roadmap.phases.map((p, i) => {
        if (i !== phaseIndex) return p
        const tasks = p.tasks.map(t => (t.id === taskId ? { ...t, done: !t.done } : t))
        return { ...p, tasks, status: recomputeStatus({ ...p, tasks }) }
      }),
    }
    setRoadmap(next)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('brand_profiles')
        .update({ roadmap_json: next as unknown as Record<string, unknown> })
        .eq('user_id', user.id)
    }
  }

  const hasStrategy = strategy && strategy.perfil_brave

  if (!hasStrategy) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BraviGuide section="mi-marca" size={64} />
          <div>
            <h1 className="text-2xl font-bold title-shine">Mi Estrategia</h1>
            <p className="mt-1 text-sm text-cherry-dark opacity-80">
              Tu ficha estratégica completa, preparada por tu estilista BRÄVE.
            </p>
          </div>
        </div>
        <div
          className="rounded-[var(--radius-lg)] p-8 text-center bg-white shadow-soft"
          style={{ border: '1.5px solid var(--color-buttermilk)' }}
        >
          <div className="text-4xl mb-3 float-soft inline-block">📋</div>
          <h3 className="text-xl font-bold text-cherry-dark mb-2">Tu estrategia estará disponible pronto</h3>
          <p className="text-sm text-cherry-dark opacity-70 max-w-md mx-auto">
            Tu estilista está preparando tu estrategia personalizada. Cuando esté lista, la verás aquí con todos los detalles: tu clienta ideal, objetivos, plan de acción y hoja de ruta.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BraviGuide section="mi-marca" size={64} />
        <div>
          <h1 className="text-2xl font-bold title-shine">Mi Estrategia</h1>
          <p className="mt-1 text-sm text-cherry-dark opacity-80">
            Tu ficha estratégica completa, preparada por tu estilista BRÄVE.
          </p>
        </div>
      </div>

      <StrategyDisplay strategy={strategy} onRegenerate={() => {}} />

      {roadmap && roadmap.phases.length > 0 && (
        <RoadmapDisplay
          roadmap={roadmap}
          onRegenerate={() => {}}
          onTaskToggle={toggleRoadmapTask}
        />
      )}
    </div>
  )
}