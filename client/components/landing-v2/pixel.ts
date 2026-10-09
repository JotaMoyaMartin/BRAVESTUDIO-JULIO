// Meta Pixel — track seguro desde el cliente.
// No-op si el pixel aún no cargó (bloqueadores, SSR, local sin red a Meta).
// Eventos usados: InitiateCheckout (entrar al checkout desde V2Pricing).
type Fbq = (...args: unknown[]) => void

export function fbqTrack(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const fbq = (window as unknown as { fbq?: Fbq }).fbq
  if (!fbq) return
  fbq('track', event, params)
}