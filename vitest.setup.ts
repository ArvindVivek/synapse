// Owner rule (2026-09-29): tests never spend on OpenAI. Any unit test that forgets to stub
// fetch fails here instead of sending a real request.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("api.openai.com")) throw new Error(`Unit tests must stub the model; blocked a real call to ${url}`);
  return realFetch(input, init);
}) as typeof fetch;
