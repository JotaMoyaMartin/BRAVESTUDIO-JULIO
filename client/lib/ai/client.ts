export type AIProvider = 'anthropic' | 'openai' | 'mock'

const provider = (process.env.AI_PROVIDER || 'mock') as AIProvider
const apiKey = process.env.AI_API_KEY

export async function generateContent(prompt: string): Promise<string> {
  if (provider === 'mock' || !apiKey) {
    return mockGenerate(prompt)
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text || ''
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  return mockGenerate(prompt)
}

function mockGenerate(_prompt: string): string {
  return JSON.stringify({ _mock: true })
}
