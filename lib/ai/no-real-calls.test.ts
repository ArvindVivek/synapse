import { expect, it } from 'vitest'

// Pins vitest.setup.ts: an unstubbed call to OpenAI fails the test instead of spending money.
it('blocks real OpenAI calls in unit tests', async () => {
  await expect(fetch('https://api.openai.com/v1/chat/completions', { method: 'POST' })).rejects.toThrow(/must stub the model/)
})
