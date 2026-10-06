import crypto from 'node:crypto'

/**
 * Cifrado de tokens sociales (AES-256-GCM) — SOLO server.
 *
 * Formato del ciphertext: `v1:<base64(iv)>:<base64(authTag + ciphertext)>`
 * - iv aleatorio de 12 bytes por cifrado (NUNCA se reutiliza).
 * - authTag (16 bytes) va delante del ciphertext en el mismo buffer.
 * - La clave es SHA-256 de SOCIAL_TOKEN_SECRET → 32 bytes estables.
 *
 * El plaintext NUNCA se guarda ni se loguea. SOCIAL_TOKEN_SECRET solo
 * debe vivir en env de server (Vercel) — no tiene prefijo NEXT_PUBLIC_.
 */

const SECRET_ENV = 'SOCIAL_TOKEN_SECRET'
const VERSION = 'v1'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function loadKey(): Buffer {
  const secret = process.env[SECRET_ENV]
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      `Falta ${SECRET_ENV} en el servidor — sin ella no se pueden cifrar los tokens sociales (configúrala en Vercel y despliega).`,
    )
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest()
}

/** true si existe la clave de cifrado (para estados de UI / 503 limpios). */
export function isSocialCryptoConfigured(): boolean {
  const secret = process.env[SECRET_ENV]
  return !!secret && secret.trim().length > 0
}

/** Cifra un token (AES-256-GCM) → `v1:iv:tag+cipher` (base64). */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) throw new Error('No se puede cifrar un token vacío.')
  const key = loadKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64'),
    Buffer.concat([tag, ciphertext]).toString('base64'),
  ].join(':')
}

/** Descifra un token cifrado con encryptSecret. Lanza si está manipulado. */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Token cifrado ausente o con formato inválido.')
  }
  const parts = ciphertext.split(':')
  if (parts.length !== 3 || parts[0] !== VERSION) {
    throw new Error('Token cifrado con formato inválido (se esperaba v1:iv:tag+cipher).')
  }
  const key = loadKey()
  const iv = Buffer.from(parts[1], 'base64')
  const tagged = Buffer.from(parts[2], 'base64')
  if (iv.length !== IV_LENGTH || tagged.length <= TAG_LENGTH) {
    throw new Error('Token cifrado incompleto (iv o tag con longitud incorrecta).')
  }
  const tag = tagged.subarray(0, TAG_LENGTH)
  const data = tagged.subarray(TAG_LENGTH)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('El token cifrado no es válido (firma GCM incorrecta o clave distinta).')
  }
}