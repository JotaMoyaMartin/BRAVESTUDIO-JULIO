import { describe, expect, it } from 'vitest'
import {
  generatePkcePair,
  parseDesignRef,
  sha256Base64Url,
} from '@/lib/integrations/canva/auth'

describe('parseDesignRef', () => {
  it('acepta Design ID pelado', () => {
    expect(parseDesignRef('DAFVztcvd9z')).toBe('DAFVztcvd9z')
  })
  it('acepta URL canva.com/design/{id}/edit', () => {
    expect(parseDesignRef('https://www.canva.com/design/DAFVztcvd9z/edit?ui=x')).toBe('DAFVztcvd9z')
  })
  it('acepta URL con query y view', () => {
    expect(parseDesignRef('https://www.canva.com/design/DAFVztcvd9z/view')).toBe('DAFVztcvd9z')
  })
  it('rechaza basura / vacío', () => {
    expect(parseDesignRef('')).toBeNull()
    expect(parseDesignRef('hola mundo')).toBeNull()
    expect(parseDesignRef('AXFVztcvd9z')).toBeNull()
  })
})

describe('PKCE', () => {
  it('el verifier está en el rango 43–128 chars ASCII', () => {
    const { verifier } = generatePkcePair()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })
  it('challenge = base64url(sha256(verifier)) S256', () => {
    const { verifier, challenge } = generatePkcePair()
    expect(challenge).toBe(sha256Base64Url(verifier))
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
  })
  it('cada pair es único', () => {
    const a = generatePkcePair()
    const b = generatePkcePair()
    expect(a.verifier).not.toBe(b.verifier)
  })
})