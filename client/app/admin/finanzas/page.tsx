import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import FinanzasEmbed from './FinanzasEmbed'

export default async function FinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Solo superadmin puede ver esta página
  if (!profile || profile.role !== 'superadmin') {
    redirect('/no-permissions')
  }

  const htmlPath = join(process.cwd(), 'private', 'finanzas.html')
  const htmlContent = readFileSync(htmlPath, 'utf-8')

  return <FinanzasEmbed htmlContent={htmlContent} />
}
