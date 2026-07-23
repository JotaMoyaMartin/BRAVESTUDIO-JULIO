'use client'

export default function Finanzas() {
  return (
    <div className="fixed inset-0 top-[57px] left-[240px] z-10">
      <iframe
        src="/api/team/finanzas"
        title="Finanzas BRAVECONTENT"
        className="w-full h-full border-0"
        allow="clipboard-write"
      />
    </div>
  )
}
