'use client'

import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  htmlContent: string
}

export default function FinanzasEmbed({ htmlContent }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-cream)' }}>
      {/* BraveStudio admin header bar */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
        style={{
          background: '#fff',
          borderColor: 'rgba(122,24,50,0.12)',
          boxShadow: '0 1px 4px rgba(122,24,50,0.06)',
        }}
      >
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-cherry-dark)' }}
        >
          <ArrowLeft size={15} />
          Admin
        </Link>
        <div
          className="w-px h-4 shrink-0"
          style={{ background: 'rgba(122,24,50,0.15)' }}
        />
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-cherry)' }}
          >
            <ShieldCheck size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold" style={{ color: 'var(--color-cherry-dark)' }}>
              BRÄVE CONTENT — Finanzas
            </span>
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(122,24,50,0.1)', color: 'var(--color-cherry)' }}
            >
              Solo Admin
            </span>
          </div>
        </div>
      </div>

      {/* Finance app iframe — srcdoc keeps the HTML off any public URL */}
      <iframe
        srcDoc={htmlContent}
        title="Finanzas BRAVECONTENT"
        className="flex-1 w-full border-0"
        style={{ height: 'calc(100vh - 53px)' }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  )
}
