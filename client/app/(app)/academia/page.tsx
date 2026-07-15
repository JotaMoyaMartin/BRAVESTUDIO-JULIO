import { createClient } from '@/lib/supabase/server'
import AcademiaClient from './AcademiaClient'
import { AcademiaModule, AcademiaLesson, AcademiaLessonProgress } from '@/types/database'

const IS_CONFIGURED = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')

export default async function AcademiaPage() {
  if (!IS_CONFIGURED) {
    return <AcademiaClient modules={[]} lessons={[]} progress={[]} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    supabase.from('academia_modules').select('*').eq('status', 'active').order('sort_order', { ascending: true }),
    supabase.from('academia_lessons').select('*').eq('status', 'active').order('sort_order', { ascending: true }),
    supabase.from('academia_lesson_progress').select('lesson_id, completed').eq('user_id', user!.id),
  ])

  return (
    <AcademiaClient
      modules={(modulesRes.data as AcademiaModule[]) || []}
      lessons={(lessonsRes.data as AcademiaLesson[]) || []}
      progress={(progressRes.data as Pick<AcademiaLessonProgress, 'lesson_id' | 'completed'>[]) || []}
    />
  )
}