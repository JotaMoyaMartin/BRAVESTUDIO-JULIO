import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function NoPermissionsPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div
        className="w-16 h-16 rounded-[var(--radius-md)] flex items-center justify-center mb-5"
        style={{ background: 'rgba(192,57,78,0.1)' }}
      >
        <ShieldAlert size={32} className="text-cherry" />
      </div>
      <h1 className="text-2xl font-bold text-cherry-dark mb-2">
        No tienes permisos para acceder a esta sección.
      </h1>
      <p className="text-sm text-ink opacity-70 mb-6 max-w-sm">
        Tu cuenta no tiene rol de administrador. Si crees que es un error, contacta con el equipo de BRÄVE.
      </p>
      <Link href="/inicio" className="btn-primary inline-block px-6 py-3 rounded-[var(--radius-sm)]">
        Volver al inicio
      </Link>
    </div>
  )
}