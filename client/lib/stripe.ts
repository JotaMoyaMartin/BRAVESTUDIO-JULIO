import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe: Stripe | null = key ? new Stripe(key, { apiVersion: '2024-06-20' as any }) : null

export const STRIPE_CONFIGURED = !!key
