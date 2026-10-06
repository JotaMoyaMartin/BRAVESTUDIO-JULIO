import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { encryptSecret, decryptSecret, isSocialCryptoConfigured } from '@/lib/crypto'

/**
 * Tests del cifrado de tokens sociales (AES-256-GCM).
 * lib/crypto lee SOCIAL_TOKEN_SECRET de forma perezosa (en cada llamada),
 * así que configurarlo aquí cubre todo el test — igual que el server real.
 */

const KEY = 'test-secret-brave-social-fase-1'

beforeAll(() => {
  process.env.SOCIAL_TOKEN_SECRET = KEY
})

afterAll(() => {
  delete process.env.SOCIAL_TOKEN_SECRET
})

describe('encryptSecret / decryptSecret — roundtrip', () => {
  it('cifra y descifra un token fielmente', () => {
    const token = 'IGEA|1v1.90|abc123.long-lived-token-xyz=='
    const cipher = encryptSecret(token)
    expect(cipher.startsWith('v1:')).toBe(true)
    const partes = cipher.split(':')
    expect(partes.length).toBe(3)
    expect(decryptSecret(cipher)).toBe(token)
  })

  it('mismo plaintext → cifrados distintos (iv aleatorio por cifrado)', () => {
    const a = encryptSecret('mismo-token')
    const b = encryptSecret('mismo-token')
    expect(a).not.toBe(b)
    // pero ambos descifran al mismo valor
    expect(decryptSecret(a)).toBe('mismo-token')
    expect(decryptSecret(b)).toBe('mismo-token')
  })

  it('cifra caracteres UTF-8 (usuario con ñ/emojis) sin perder datos', () => {
    const token = 'token-con-ñ-✂-emoji-🔒'
    expect(decryptSecret(encryptSecret(token))).toBe(token)
  })
})

describe('integridad (GCM detesta manipulaciones)', () => {
  it('lanzamiento si se altera un byte del payload', () => {
    const cipher = encryptSecret('token-valido')
    const [version, ivB64, payloadB64] = cipher.split(':')
    const payload = Buffer.from(payloadB64, 'base64')
    payload[payload.length - 1] ^= 0x01 // flip de 1 bit
    const tampered = [version, ivB64, payload.toString('base64')].join(':')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('lanzamiento con formato inválido (no v1 / número de partes incorrecto)', () => {
    expect(() => decryptSecret('basura-sin-formato')).toThrow(/formato/)
    expect(() => decryptSecret('v9:AAAA:BBBB')).toThrow(/formato/)
  })

  it('plaintext vacío rechazado antes de cifrar', () => {
    expect(() => encryptSecret('')).toThrow()
  })
})

describe('isSocialCryptoConfigured', () => {
  it('true con la clave presente', () => {
    process.env.SOCIAL_TOKEN_SECRET = KEY
    expect(isSocialCryptoConfigured()).toBe(true)
  })

  it('false y errores claros sin clave (el save/repo debe fallar, no guardar en claro)', () => {
    delete process.env.SOCIAL_TOKEN_SECRET
    expect(isSocialCryptoConfigured()).toBe(false)
    expect(() => encryptSecret('x')).toThrow(/SOCIAL_TOKEN_SECRET/)
    expect(() => decryptSecret('v1:AAAA:BBBB')).toThrow(/SOCIAL_TOKEN_SECRET/)
  })
})