import { expect, it } from 'vitest'

// Pins vitest.setup.ts: an unstubbed call to Claude or OpenAI fails the test instead of spending money.
it('blocks real AI calls in unit tests', async () => {
  await expect(fetch('https://api.anthropic.com/v1/messages', { method: 'POST' })).rejects.toThrow(/must stub the model/)
  await expect(fetch('https://api.openai.com/v1/chat/completions', { method: 'POST' })).rejects.toThrow(/must stub the model/)
})
