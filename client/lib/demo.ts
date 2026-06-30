// Detecta si la app está en modo demo (sin credenciales reales de Supabase)
export const IS_DEMO = !(process.env.NEXT_PUBLIC_SUPABASE_URL || '').startsWith('http')