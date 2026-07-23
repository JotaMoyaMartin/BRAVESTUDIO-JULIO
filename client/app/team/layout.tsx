import { AuthProvider as TeamAuthProvider } from '@/lib/team/auth-context'

export const metadata = {
  title: 'Equipo · BRÄVE Studio',
  description: 'Plataforma interna del equipo BRÄVE CONTENT',
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <TeamAuthProvider>{children}</TeamAuthProvider>
}