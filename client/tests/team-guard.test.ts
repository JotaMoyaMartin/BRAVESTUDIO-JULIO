import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verifyTeamRequest, isTeamApiPath, TEAM_API_TOKEN_HEADER } from '@/lib/team/guard'

const ORIGINAL_ENV = { ...process.env }

function req(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000' + url, { headers, method: 'GET' })
}

beforeEach(() => {
  delete process.env.TEAM_API_TOKEN
})
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('isTeamApiPath', () => {
  it('detecta /team/api/ y /api/team/', () => {
    expect(isTeamApiPath('/team/api/productividad/chat')).toBe(true)
    expect(isTeamApiPath('/api/team/posts')).toBe(true)
    expect(isTeamApiPath('/team/finanzas')).toBe(false)
    expect(isTeamApiPath('/api/ai/generate')).toBe(false)
  })
})

describe('verifyTeamRequest — modo estricto (TEAM_API_TOKEN configurado)', () => {
  beforeEach(() => {
    process.env.TEAM_API_TOKEN = 'secret-token-123'
  })

  it('acepta con header correcto', () => {
    expect(verifyTeamRequest(req('/team/api/x', { [TEAM_API_TOKEN_HEADER]: 'secret-token-123' })).ok).toBe(true)
  })

  it('rechaza sin header (401)', () => {
    const r = verifyTeamRequest(req('/team/api/x'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.res.status).toBe(401)
  })

  it('rechaza header incorrecto (401)', () => {
    const r = verifyTeamRequest(req('/team/api/x', { [TEAM_API_TOKEN_HEADER]: 'wrong' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.res.status).toBe(401)
  })
})

describe('verifyTeamRequest — modo flexible (sin token)', () => {
  it('permite same-origin', () => {
    expect(verifyTeamRequest(req('/team/api/x')).ok).toBe(true)
  })

  it('permite same-origin con sec-fetch-site same-origin', () => {
    expect(verifyTeamRequest(req('/team/api/x', { 'sec-fetch-site': 'same-origin' })).ok).toBe(true)
  })

  it('bloquea cross-site (403)', () => {
    const r = verifyTeamRequest(req('/team/api/x', { 'sec-fetch-site': 'cross-site' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.res.status).toBe(403)
  })
})