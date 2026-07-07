import { Profile } from '@/types/database'

export const SOURCE_LABELS: Record<Profile['access_source'], { label: string; tone: 'blue' | 'green' | 'buttermilk' | 'neutral' | 'cherry' }> = {
  manual: { label: 'Invitación manual', tone: 'blue' },
  stripe: { label: 'Stripe (pago)', tone: 'cherry' },
  skool: { label: 'Comunidad Skool', tone: 'green' },
  promo: { label: 'Código promo', tone: 'buttermilk' },
  none: { label: 'Sin acceso (signup sin completar)', tone: 'neutral' },
}

export const SIGNUP_LABELS: Record<Profile['signup_method'], string> = {
  signup: 'Registro público',
  admin_create: 'Creado por admin',
  skool: 'Skool',
  stripe_checkout: 'Checkout Stripe',
  promo: 'Promo code',
}

export const EVENT_LABELS: Record<string, string> = {
  account_created: 'Cuenta creada',
  access_activated: 'Acceso activado',
  access_deactivated: 'Acceso desactivado',
  role_changed: 'Rol cambiado',
  promo_redeemed: 'Canjeó promo',
  stripe_subscription_created: 'Suscripción Stripe creada',
  stripe_subscription_canceled: 'Suscripción cancelada',
  stripe_payment_failed: 'Pago fallido',
}