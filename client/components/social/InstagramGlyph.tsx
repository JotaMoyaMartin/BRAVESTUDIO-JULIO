/** Icono de Instagram (lucide ya no trae logos de marca). */
export default function InstagramGlyph({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

/** Fondo degradado de Instagram para el círculo del icono. */
export const IG_GRADIENT = 'linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)'
