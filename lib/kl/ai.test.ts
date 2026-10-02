// KL Web 1.0.3, from kitchenlabs-kit/web/kl-web/lib/ai.test.ts. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ai.ts starts with `import "server-only"`, which throws outside a React Server environment.
vi.mock("server-only", () => ({}));

import {
  AIError,
  DEFAULT_MODEL,
  aiErrorResponse,
  buildBody,
  errorFromStatus,
  generateJSON,
  sseResponse,
  streamJSON,
  streamText,
  strictSchemaProblems,
  toAIError,
} from "./ai";

const schema = {
  name: "tip",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "steps"],
    properties: {
      title: { type: "string" },
      steps: { type: "array", items: { type: "string" } },
    },
  },
};

const completion = (content: string, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content, refusal: null }, finish_reason: "stop", ...extra }],
      usage: { prompt_tokens: 120, completion_tokens: 30, prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 0 } },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

/** An SSE body delivered in awkward chunks (split mid-line) like a real network. */
function sse(lines: string[], chunkSize = 7): Response {
  const text = lines.map((l) => `data: ${l}\n\n`).join("");
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
const delta = (content: string) => JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] });
const finish = (reason: string) => JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] });
const usage = JSON.stringify({ choices: [], usage: { prompt_tokens: 50, completion_tokens: 9 } });

async function collect(gen: AsyncIterable<string>): Promise<string> {
  let out = "";
  for await (const d of gen) out += d;
  return out;
}

let fetchMock: ReturnType<typeof vi.fn>;
let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("OPENAI_API_KEY", "sk-test-not-real");
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("error mapping", () => {
  it("maps OpenAI statuses to plain sentences, with the detail kept for the console", () => {
    const cases: [number, string, string][] = [
      [401, "not_configured", "The AI service isn't set up yet."],
      [403, "not_configured", "The AI service isn't set up yet."],
      [429, "busy", "The AI service is busy right now. Try again in a minute."],
      [500, "unavailable", "The AI service is having trouble. Try again in a minute."],
      [503, "unavailable", "The AI service is having trouble. Try again in a minute."],
      [400, "failed", "We couldn't get an answer this time. Please try again."],
    ];
    for (const [status, code, message] of cases) {
      const e = errorFromStatus(status, '{"error":{"message":"Incorrect API key provided: sk-..."}}');
      expect(e.code).toBe(code);
      expect(e.userMessage).toBe(message);
      expect(e.userMessage).not.toMatch(/sk-|API key|\d{3}/);
      expect(String(e.detail)).toContain("Incorrect API key");
    }
  });

  it("maps thrown things: timeouts, cancels, network failures", () => {
    expect(toAIError(new DOMException("t", "TimeoutError")).code).toBe("timeout");
    expect(toAIError(new DOMException("a", "AbortError")).code).toBe("cancelled");
    expect(toAIError(new TypeError("fetch failed")).code).toBe("unavailable");
    expect(toAIError(new Error("?")).code).toBe("failed");
    const e = new AIError("busy");
    expect(toAIError(e)).toBe(e);
  });

  it("an empty OpenAI balance says the AI is paused, not busy", () => {
    for (const body of [
      '{"error":{"code":"insufficient_quota","type":"insufficient_quota","message":"You exceeded your current quota"}}',
      '{"error":{"code":"credit_balance_exhausted","type":"insufficient_quota","message":"You have no credits remaining."}}',
    ]) {
      const e = errorFromStatus(429, body);
      expect(e.code).toBe("paused");
      expect(e.status).toBe(503);
      expect(e.userMessage).toBe("AI features are paused right now. Everything else still works.");
      expect(e.userMessage).not.toMatch(/try again|minute/i);
    }
    expect(errorFromStatus(429, '{"error":{"code":"rate_limit_exceeded"}}').code).toBe("busy");
  });

  it("builds a route response that never leaks the detail", async () => {
    const res = aiErrorResponse(errorFromStatus(429, "org quota: sk-secret"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "busy", message: "The AI service is busy right now. Try again in a minute." } });
    expect(JSON.stringify(body)).not.toContain("sk-secret");
    expect(error).toHaveBeenCalled();
  });
});

describe("strict schemas", () => {
  it("accepts a sealed schema", () => {
    expect(strictSchemaProblems(schema.schema)).toEqual([]);
  });

  it("finds every strict-mode mistake", () => {
    const problems = strictSchemaProblems({
      type: "object",
      properties: {
        a: { type: "string" },
        list: { type: "array", maxItems: 3, items: { type: "object", properties: { x: { type: ["string", "null"] } }, required: [] } },
      },
      required: ["a"],
    });
    expect(problems).toEqual([
      "$: needs additionalProperties: false",
      "$.list: must be listed in required",
      "$.list: maxItems is not allowed in strict mode",
      "$.list[]: needs additionalProperties: false",
      "$.list[].x: must be listed in required",
    ]);
  });
});

describe("generateJSON", () => {
  it("sends one strict, low-effort request and returns the parsed answer", async () => {
    fetchMock.mockResolvedValueOnce(completion('{"title":"Stretch","steps":["Stand up"]}'));
    const out = await generateJSON<{ title: string; steps: string[] }>({ system: "s", user: "u", schema, maxOutputTokens: 200, label: "tips" });
    expect(out).toEqual({ title: "Stretch", steps: ["Stand up"] });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-test-not-real");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: DEFAULT_MODEL,
      reasoning_effort: "none",
      max_completion_tokens: 200,
      response_format: { type: "json_schema", json_schema: { name: "tip", strict: true } },
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^\[ai\] provider: openai label=tips model=gpt-5\.4-mini in=120 cached=0 out=30 reasoning=0 ms=\d+$/));
  });

  it("reports token usage to onUsage", async () => {
    fetchMock.mockResolvedValueOnce(completion('{"title":"A","steps":[]}'));
    const onUsage = vi.fn();
    await generateJSON({ system: "s", user: "u", schema, onUsage });
    expect(onUsage).toHaveBeenCalledWith({ input: 120, cachedInput: 0, output: 30 });
  });

  it("refuses to run without a key, before any network call", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a non-strict schema before spending a request", async () => {
    const loose = { name: "loose", schema: { type: "object", properties: { a: { type: "string" } } } };
    await expect(generateJSON({ system: "s", user: "u", schema: loose })).rejects.toMatchObject({ code: "failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps an HTTP failure to its friendly error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("rate limited", { status: 429 }));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({
      code: "busy",
      userMessage: "The AI service is busy right now. Try again in a minute.",
    });
  });

  it("maps refusals, cut-off answers and unreadable JSON", async () => {
    fetchMock.mockResolvedValueOnce(completion("", { message: { content: null, refusal: "I can't help with that." } }));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "refused" });
    fetchMock.mockResolvedValueOnce(completion('{"title":"Str', { finish_reason: "length" }));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "too_long" });
    fetchMock.mockResolvedValueOnce(completion("not json"));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "bad_answer" });
  });

  it("maps a network failure and a timeout", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "unavailable" });
    fetchMock.mockRejectedValueOnce(new DOMException("The operation timed out.", "TimeoutError"));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "timeout" });
  });

  it("leaves reasoning_effort out when asked (models without reasoning)", () => {
    expect(buildBody({ system: "s", user: "u", reasoningEffort: null, model: "gpt-4.1-mini" }, false)).not.toHaveProperty("reasoning_effort");
    expect(buildBody({ system: "s", user: "u", reasoningEffort: "low" }, true)).toMatchObject({
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    });
  });

  it("sends images as data URLs with the chosen detail", () => {
    const body = buildBody({ system: "s", user: "read this", images: [{ base64: "AAA", mimeType: "image/jpeg" }], imageDetail: "high" }, false);
    expect((body.messages as { content: unknown }[])[1].content).toEqual([
      { type: "text", text: "read this" },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA", detail: "high" } },
    ]);
  });
});

describe("streaming", () => {
  it("streamText yields deltas across split chunks and logs usage", async () => {
    fetchMock.mockResolvedValueOnce(sse([delta("Hel"), delta("lo, "), delta("world"), finish("stop"), usage, "[DONE]"]));
    const onUsage = vi.fn();
    expect(await collect(streamText({ system: "s", user: "u", label: "greet", onUsage }))).toBe("Hello, world");
    expect(onUsage).toHaveBeenCalledWith({ input: 50, cachedInput: 0, output: 9 });
    expect(info).toHaveBeenCalledWith(expect.stringContaining("label=greet model=gpt-5.4-mini in=50"));
  });

  it("streamJSON throws after the deltas when the stream breaks off", async () => {
    fetchMock.mockResolvedValueOnce(sse([delta('{"title":'), delta('"Str')]));
    const gen = streamJSON({ system: "s", user: "u", schema });
    let got = "";
    await expect(
      (async () => {
        for await (const d of gen) got += d;
      })(),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(got).toBe('{"title":"Str');
  });

  it("streamJSON maps a cut-off answer", async () => {
    fetchMock.mockResolvedValueOnce(sse([delta("{"), finish("length"), "[DONE]"]));
    await expect(collect(streamJSON({ system: "s", user: "u", schema }))).rejects.toMatchObject({ code: "too_long" });
  });

  it("sseResponse sends delta events, then the parsed result", async () => {
    fetchMock.mockResolvedValueOnce(sse([delta('{"title":"A",'), delta('"steps":[]}'), finish("stop"), "[DONE]"]));
    const res = sseResponse(streamJSON({ system: "s", user: "u", schema }), { json: true });
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const events = (await res.text())
      .split("\n\n")
      .filter(Boolean)
      .map((e) => JSON.parse(e.replace(/^data: /, "")));
    expect(events).toEqual([
      { type: "delta", text: '{"title":"A",' },
      { type: "delta", text: '"steps":[]}' },
      { type: "result", data: { title: "A", steps: [] } },
    ]);
  });

  it("sseResponse ends with a friendly error event, never the detail", async () => {
    fetchMock.mockResolvedValueOnce(new Response("upstream exploded: sk-secret", { status: 502 }));
    const text = await sseResponse(streamText({ system: "s", user: "u" })).text();
    expect(JSON.parse(text.trim().replace(/^data: /, ""))).toEqual({
      type: "error",
      code: "unavailable",
      message: "The AI service is having trouble. Try again in a minute.",
    });
    expect(text).not.toContain("sk-secret");
  });
});
