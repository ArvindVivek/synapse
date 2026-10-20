// KL Web 1.1.6, from kitchenlabs-kit/web/kl-web/lib/ai.test.ts. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ai.ts starts with `import "server-only"`, which throws outside a React Server environment.
vi.mock("server-only", () => ({}));

import {
  AIError,
  CLAUDE_MODEL,
  DEFAULT_MODEL,
  OPENAI_MODEL,
  aiErrorResponse,
  anthropicErrorFromStatus,
  buildAnthropicBody,
  buildBody,
  claudeToolSchema,
  errorFromStatus,
  schemaMismatches,
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
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("OPENAI_API_KEY", "sk-test-not-real");
  // Claude is off unless a test turns it on, so the OpenAI tests below exercise the fallback path.
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
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
      model: OPENAI_MODEL,
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

// ---------------------------------------------------------------------------------------------
// Claude first

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const claudeMessage = (content: unknown[], stop_reason = "end_turn") =>
  Response.json({
    content,
    stop_reason,
    usage: { input_tokens: 100, cache_read_input_tokens: 20, cache_creation_input_tokens: 0, output_tokens: 15 },
  });
/** A structured-output answer: the JSON arrives as text (after any thinking block). */
const jsonAnswer = (input: unknown) => ({ type: "text", text: JSON.stringify(input) });

/** A Claude SSE body (`event:` + `data:` per event), split mid-line like a real network. */
function claudeSSE(events: Record<string, unknown>[], chunkSize = 11): Response {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
const start = { type: "message_start", message: { usage: { input_tokens: 40, cache_read_input_tokens: 10, output_tokens: 1 } } };
const textDelta = (text: string) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
const jsonDelta = (text: string) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
const stop = (stop_reason: string) => ({ type: "message_delta", delta: { stop_reason }, usage: { output_tokens: 12 } });
const end = { type: "message_stop" };

const urls = () => fetchMock.mock.calls.map((c) => c[0]);

describe("Claude first", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-not-real"));

  it("defaults to Claude's cheap tier, with OpenAI's mini as the fallback", () => {
    expect(DEFAULT_MODEL).toBe(CLAUDE_MODEL);
    expect(CLAUDE_MODEL).toBe("claude-haiku-5-5");
    expect(OPENAI_MODEL).toBe("gpt-5.4-mini");
  });

  it("builds a Messages API body: system apart, structured output for JSON, thinking off on Haiku", () => {
    const body = buildAnthropicBody({ system: "sys", user: "u", schema, maxOutputTokens: 200 }, false);
    expect(body).toEqual({
      model: "claude-haiku-5-5",
      max_tokens: 200,
      system: "sys",
      messages: [{ role: "user", content: "u" }],
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: schema.schema } },
    });
    // No forced tool: Sonnet 5.5, Opus 5.5 and Fable 5.1 reject tool_choice "tool".
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
    const text = buildAnthropicBody({ system: "s", user: "u" }, true);
    expect(text).toEqual({ model: "claude-haiku-5-5", max_tokens: 2048, system: "s", messages: [{ role: "user", content: "u" }], thinking: { type: "disabled" }, stream: true });
  });

  it("Sonnet and Opus think: effort from reasoningEffort (none = low), room for thinking on the cap", () => {
    const sonnet = buildAnthropicBody({ system: "s", user: "u", schema, model: "claude-sonnet-5-5", maxOutputTokens: 300 }, false);
    expect(sonnet).not.toHaveProperty("thinking");
    expect(sonnet).not.toHaveProperty("tool_choice");
    expect(sonnet).toMatchObject({
      max_tokens: 300 + 4096,
      output_config: { effort: "low", format: { type: "json_schema", schema: schema.schema } },
    });
    expect(buildAnthropicBody({ system: "s", user: "u", model: "claude-opus-5-5", reasoningEffort: "high" }, true)).toMatchObject({
      max_tokens: 2048 + 4096,
      output_config: { effort: "high" },
    });
  });

  it("reads a structured answer that follows a thinking block", async () => {
    fetchMock.mockResolvedValueOnce(claudeMessage([{ type: "thinking", thinking: "", signature: "x" }, jsonAnswer({ title: "S", steps: [] })]));
    expect(await generateJSON({ system: "s", user: "u", schema, model: "claude-sonnet-5-5" })).toEqual({ title: "S", steps: [] });
    expect(urls()).toEqual([CLAUDE_URL]);
  });

  it("sends Claude a strict-mode-safe schema: unsupported constraints dropped, the rest kept", () => {
    const loose = {
      type: "object",
      additionalProperties: false,
      required: ["age", "name", "tags", "pick"],
      properties: {
        age: { type: "integer", minimum: 0, maximum: 130 },
        name: { type: "string", minLength: 1, maxLength: 80, pattern: "^[A-Z]", format: "name" },
        tags: { type: "array", minItems: 2, items: { type: "string", enum: ["a", "b"] } },
        pick: { oneOf: [{ type: "string", format: "email" }, { type: "null" }] },
        minimum: { type: ["string", "null"] },
      },
    };
    expect(claudeToolSchema(loose)).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["age", "name", "tags", "pick"],
      properties: {
        age: { type: "integer" },
        name: { type: "string" },
        tags: { type: "array", items: { type: "string", enum: ["a", "b"] } },
        pick: { anyOf: [{ type: "string", format: "email" }, { type: "null" }] },
        minimum: { type: ["string", "null"] },
      },
    });
    expect(claudeToolSchema(schema.schema)).toEqual(schema.schema);
  });

  it("splits a nullable enum or const into anyOf, the form Claude's strict mode accepts", () => {
    expect(claudeToolSchema({ type: ["string", "null"], enum: ["light", "dark", null], description: "theme" })).toEqual({
      description: "theme",
      anyOf: [{ type: "string", enum: ["light", "dark"] }, { type: "null" }],
    });
    // No null in the enum: null isn't allowed, so only the string branch stays.
    expect(claudeToolSchema({ type: ["string", "null"], enum: ["a", "b"] })).toEqual({ type: "string", enum: ["a", "b"] });
    expect(claudeToolSchema({ type: ["integer", "string", "null"], enum: [1, "x", null] })).toEqual({
      anyOf: [{ type: "integer", enum: [1] }, { type: "string", enum: ["x"] }, { type: "null" }],
    });
    expect(claudeToolSchema({ type: ["string", "null"], const: "fixed" })).toEqual({ type: "string", const: "fixed" });
    // Nested, and type unions without enum/const are left alone.
    const nested = claudeToolSchema({
      type: "object",
      additionalProperties: false,
      required: ["level", "note"],
      properties: { level: { type: ["string", "null"], enum: ["low", null] }, note: { type: ["string", "null"] } },
    }) as { properties: Record<string, unknown> };
    expect(nested.properties.level).toEqual({ anyOf: [{ type: "string", enum: ["low"] }, { type: "null" }] });
    expect(nested.properties.note).toEqual({ type: ["string", "null"] });
    // The split schema accepts exactly what the original does.
    const original = { type: ["string", "null"], enum: ["light", null] };
    for (const value of ["light", null, "dark", 3]) {
      expect(schemaMismatches(value, claudeToolSchema(original)).length === 0).toBe(schemaMismatches(value, original).length === 0);
    }
  });

  it("falls back to OpenAI when Claude rejects the request (a 400 such as a schema it won't take)", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{"error":{"type":"invalid_request_error","message":"tools.0.input_schema: too complex"}}', { status: 400 }))
      .mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    expect(await generateJSON({ system: "s", user: "u", schema })).toEqual({ title: "B", steps: [] });
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);
  });

  it("sends images as image blocks before the text", () => {
    const body = buildAnthropicBody({ system: "s", user: "read this", images: [{ base64: "AAA", mimeType: "image/jpeg" }, { url: "https://x.test/a.png" }] }, false);
    expect((body.messages as { content: unknown }[])[0].content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAA" } },
      { type: "image", source: { type: "url", url: "https://x.test/a.png" } },
      { type: "text", text: "read this" },
    ]);
  });

  it("a claude-… model overrides Claude; any other model overrides only the OpenAI fallback", () => {
    const sonnet = buildAnthropicBody({ system: "s", user: "u", model: "claude-sonnet-5-5" }, false);
    expect(sonnet.model).toBe("claude-sonnet-5-5");
    expect(sonnet).not.toHaveProperty("thinking"); // Sonnet 5.5 rejects "disabled"
    expect(buildBody({ system: "s", user: "u", model: "claude-sonnet-5-5" }, false).model).toBe(OPENAI_MODEL);
    expect(buildAnthropicBody({ system: "s", user: "u", model: "gpt-4.1-mini" }, false).model).toBe(CLAUDE_MODEL);
    expect(buildBody({ system: "s", user: "u", model: "gpt-4.1-mini" }, false).model).toBe("gpt-4.1-mini");
  });

  it("maps Claude statuses: auth, rate limit, overload, empty credit, oversized", () => {
    const cases: [number, string, string][] = [
      [401, "", "not_configured"],
      [403, "", "not_configured"],
      [429, "", "busy"],
      [500, "", "unavailable"],
      [529, '{"type":"error","error":{"type":"overloaded_error"}}', "unavailable"],
      [400, '{"error":{"message":"Your credit balance is too low to access the Anthropic API."}}', "paused"],
      [402, '{"error":{"type":"billing_error"}}', "paused"],
      [413, "", "too_long"],
      [400, '{"error":{"message":"messages: field required"}}', "failed"],
    ];
    for (const [status, body, code] of cases) {
      const e = anthropicErrorFromStatus(status, body);
      expect(e.code, `${status} ${body}`).toBe(code);
      expect(e.userMessage).not.toMatch(/claude|anthropic|openai/i);
    }
  });

  it("generateJSON answers from Claude's structured output, with one request and a usage line", async () => {
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer({ title: "Stretch", steps: ["Stand up"] })]));
    const onUsage = vi.fn();
    const out = await generateJSON({ system: "s", user: "u", schema, label: "tips", onUsage });
    expect(out).toEqual({ title: "Stretch", steps: ["Stand up"] });
    expect(urls()).toEqual([CLAUDE_URL]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-api-key"]).toBe("sk-ant-test-not-real");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(onUsage).toHaveBeenCalledWith({ input: 120, cachedInput: 20, output: 15 });
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^\[ai\] provider: anthropic label=tips model=claude-haiku-5-5 in=120 cached=20 out=15 ms=\d+$/));
  });

  it.each([
    ["busy", () => new Response('{"error":{"type":"rate_limit_error"}}', { status: 429 })],
    ["overloaded", () => new Response('{"error":{"type":"overloaded_error"}}', { status: 529 })],
    ["out of credit", () => new Response('{"error":{"message":"Your credit balance is too low"}}', { status: 400 })],
    ["unreadable (not JSON)", () => claudeMessage([{ type: "text", text: "Here you go" }], "end_turn")],
  ])("falls back to OpenAI when Claude is %s", async (_, reply) => {
    fetchMock.mockResolvedValueOnce(reply()).mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    const onUsage = vi.fn();
    expect(await generateJSON({ system: "s", user: "u", schema, onUsage })).toEqual({ title: "B", steps: [] });
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);
    expect(onUsage).toHaveBeenLastCalledWith({ input: 120, cachedInput: 0, output: 30 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[ai] provider: anthropic failed"), expect.anything());
  });

  it("falls back without a request when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    fetchMock.mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    await generateJSON({ system: "s", user: "u", schema });
    expect(urls()).toEqual([OPENAI_URL]);
  });

  it("gives Claude part of the time budget, then hands the rest to OpenAI", async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason))),
    );
    fetchMock.mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    const started = performance.now();
    expect(await generateJSON({ system: "s", user: "u", schema, timeoutMs: 200 })).toEqual({ title: "B", steps: [] });
    expect(performance.now() - started).toBeLessThan(200);
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("(timeout)"), expect.anything());
  });

  it("does not fall back on a refusal, a cut-off answer or a cancel", async () => {
    fetchMock.mockResolvedValueOnce(claudeMessage([], "refusal"));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "refused" });
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer({})], "max_tokens"));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "too_long" });
    const cancel = new AbortController();
    cancel.abort();
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    await expect(generateJSON({ system: "s", user: "u", schema, signal: cancel.signal })).rejects.toMatchObject({ code: "cancelled" });
    expect(urls()).toEqual([CLAUDE_URL, CLAUDE_URL, CLAUDE_URL]);
  });

  it("when both fail, throws Claude's error (unless Claude just wasn't set up)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("overloaded", { status: 529 })).mockResolvedValueOnce(new Response("rate limited", { status: 429 }));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "unavailable" });
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    fetchMock.mockResolvedValueOnce(new Response("rate limited", { status: 429 }));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "busy" });
  });

  it("streamText yields Claude's text deltas (skipping pings and thinking) and reports usage", async () => {
    fetchMock.mockResolvedValueOnce(
      claudeSSE([
        start,
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "ping" },
        textDelta("Hel"),
        { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "hmm" } },
        textDelta("lo, "),
        textDelta("world"),
        { type: "content_block_stop", index: 0 },
        stop("end_turn"),
        end,
      ]),
    );
    const onUsage = vi.fn();
    expect(await collect(streamText({ system: "s", user: "u", label: "greet", onUsage }))).toBe("Hello, world");
    expect(urls()).toEqual([CLAUDE_URL]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ stream: true, model: "claude-haiku-5-5" });
    expect(onUsage).toHaveBeenCalledWith({ input: 50, cachedInput: 10, output: 12 });
    expect(info).toHaveBeenCalledWith(expect.stringContaining("[ai] provider: anthropic label=greet model=claude-haiku-5-5 in=50 cached=10 out=12"));
  });

  it("streamJSON yields Claude's structured-output deltas, so sseResponse parses the result", async () => {
    fetchMock.mockResolvedValueOnce(
      claudeSSE([
        start,
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        jsonDelta(""),
        jsonDelta('{"title":"A",'),
        jsonDelta('"steps":[]}'),
        stop("end_turn"),
        end,
      ]),
    );
    const res = sseResponse(streamJSON({ system: "s", user: "u", schema }), { json: true });
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

  it("a stream falls back to OpenAI when Claude fails before its first delta", async () => {
    fetchMock
      .mockResolvedValueOnce(claudeSSE([start, { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }]))
      .mockResolvedValueOnce(sse([delta("Hi"), finish("stop"), "[DONE]"]));
    expect(await collect(streamText({ system: "s", user: "u" }))).toBe("Hi");
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(sse([delta("Hi"), finish("stop"), "[DONE]"]));
    expect(await collect(streamText({ system: "s", user: "u" }))).toBe("Hi");
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);
  });

  it("a stream that already sent text never switches provider", async () => {
    fetchMock.mockResolvedValueOnce(claudeSSE([start, textDelta("Half an ans"), { type: "error", error: { type: "overloaded_error" } }]));
    let got = "";
    await expect(
      (async () => {
        for await (const d of streamText({ system: "s", user: "u" })) got += d;
      })(),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(got).toBe("Half an ans");
    expect(urls()).toEqual([CLAUDE_URL]);
  });

  it("a stream maps Claude's refusal and cut-off without falling back", async () => {
    fetchMock.mockResolvedValueOnce(claudeSSE([start, stop("refusal"), end]));
    await expect(collect(streamText({ system: "s", user: "u" }))).rejects.toMatchObject({ code: "refused" });
    fetchMock.mockResolvedValueOnce(claudeSSE([start, jsonDelta('{"ti'), stop("max_tokens"), end]));
    await expect(collect(streamJSON({ system: "s", user: "u", schema }))).rejects.toMatchObject({ code: "too_long" });
    expect(urls()).toEqual([CLAUDE_URL, CLAUDE_URL]);
  });
});

describe("answers are checked against the schema", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-not-real"));

  const rich = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "note", "steps"],
    properties: {
      kind: { type: "string", enum: ["tip", "warning"] },
      note: { type: ["string", "null"] },
      steps: { type: "array", items: { $ref: "#/$defs/step" } },
    },
    $defs: {
      step: { type: "object", additionalProperties: false, required: ["n"], properties: { n: { type: "integer" } } },
    },
  };

  it("schemaMismatches covers types, null unions, required, extra keys, enums, items, $ref and anyOf", () => {
    expect(schemaMismatches({ kind: "tip", note: null, steps: [{ n: 1 }] }, rich)).toEqual([]);
    expect(schemaMismatches({ kind: "nope", note: 3, steps: [{ n: 1.5, x: 1 }], extra: true }, rich)).toEqual([
      "$.kind: not one of the allowed values",
      "$.note: expected string | null",
      "$.steps[0].n: expected integer",
      "$.steps[0].x: not allowed",
      "$.extra: not allowed",
    ]);
    expect(schemaMismatches({ steps: "x" }, rich)).toEqual(["$.kind: missing", "$.note: missing", "$.steps: expected array"]);
    expect(schemaMismatches(5, { anyOf: [{ type: "string" }, { type: "null" }] })).toEqual(["$: matches none of anyOf"]);
    expect(schemaMismatches(null, { anyOf: [{ type: "string" }, { type: "null" }] })).toEqual([]);
  });

  it.each([
    ["a missing required key", { title: "A" }],
    ["an extra key", { title: "A", steps: [], secret: "x" }],
    ["a wrong type", { title: 7, steps: [] }],
  ])("generateJSON falls back to OpenAI when Claude's answer has %s", async (_, input) => {
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer(input)])).mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    expect(await generateJSON({ system: "s", user: "u", schema })).toEqual({ title: "B", steps: [] });
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("(bad_answer)"), expect.stringContaining("does not match schema tip"));
  });

  it("generateJSON falls back on an enum miss", async () => {
    const level = { name: "level", schema: { type: "object", additionalProperties: false, required: ["level"], properties: { level: { type: "string", enum: ["low", "high"] } } } };
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer({ level: "medium" })])).mockResolvedValueOnce(completion('{"level":"low"}'));
    expect(await generateJSON({ system: "s", user: "u", schema: level })).toEqual({ level: "low" });
    expect(urls()).toEqual([CLAUDE_URL, OPENAI_URL]);
  });

  it("when both answers break the schema, the result is bad_answer", async () => {
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer({ title: "A" })])).mockResolvedValueOnce(completion('{"title":"B"}'));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "bad_answer" });
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    fetchMock.mockResolvedValueOnce(completion('{"title":"B","steps":[],"more":1}'));
    await expect(generateJSON({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "bad_answer" });
  });

  it("streamJSON checks the finished answer: a mismatch ends with an error event, never a result", async () => {
    fetchMock.mockResolvedValueOnce(claudeSSE([start, jsonDelta('{"title":"A",'), jsonDelta('"extra":1}'), stop("end_turn"), end]));
    const events = (await sseResponse(streamJSON({ system: "s", user: "u", schema }), { json: true }).text())
      .split("\n\n")
      .filter(Boolean)
      .map((e) => JSON.parse(e.replace(/^data: /, "")));
    expect(events).toEqual([
      { type: "delta", text: '{"title":"A",' },
      { type: "delta", text: '"extra":1}' },
      { type: "error", code: "bad_answer", message: "We got an unreadable answer. Please try again." },
    ]);

    vi.stubEnv("ANTHROPIC_API_KEY", "");
    fetchMock.mockResolvedValueOnce(sse([delta('{"title":"A"}'), finish("stop"), "[DONE]"]));
    await expect(collect(streamJSON({ system: "s", user: "u", schema }))).rejects.toMatchObject({ code: "bad_answer" });
  });
});

describe("logs never hold the prompt, the answer or a key", () => {
  // Short on purpose: JSON.parse errors quote short inputs in full, so a leak would show.
  const PROMPT = "PRM7f3";
  const ANSWER = "ANS9c1";
  const req = { system: `sys ${PROMPT}`, user: `user ${PROMPT}`, images: [{ base64: `${PROMPT}AAA`, mimeType: "image/png" }], schema };

  /** Everything any console method was called with, formatted the way the console prints it. */
  function logged(): string {
    return [info, warn, error]
      .flatMap((spy) => spy.mock.calls.flat())
      .map((arg: unknown) => (typeof arg === "string" ? arg : inspect(arg, { depth: 10 })))
      .join("\n");
  }
  const expectClean = () => {
    const text = logged();
    expect(text).not.toContain(PROMPT);
    expect(text).not.toContain(ANSWER);
    expect(text).not.toMatch(/sk-(?!\[redacted\])[A-Za-z0-9]/);
  };

  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-not-real"));

  it("success", async () => {
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer({ title: ANSWER, steps: [ANSWER] })]));
    await generateJSON(req);
    expect(logged()).toContain("[ai] provider: anthropic");
    expectClean();
  });

  it("schema mismatch on both providers keeps only the paths", async () => {
    fetchMock
      .mockResolvedValueOnce(claudeMessage([jsonAnswer({ title: ANSWER, steps: 7, extra: ANSWER })]))
      .mockResolvedValueOnce(completion(`{"title":7,"steps":["${ANSWER}"]}`));
    const err = await generateJSON(req).catch((e) => e);
    expect(err).toMatchObject({ code: "bad_answer" });
    aiErrorResponse(err);
    // Claude's mismatch (the more useful error) is what gets logged: paths, never values.
    expect(logged()).toContain("$.steps: expected array; $.extra: not allowed");
    expectClean();
  });

  it("unreadable JSON, refusal and a cut-off stream", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    fetchMock.mockResolvedValueOnce(completion(`${ANSWER}?`));
    aiErrorResponse(await generateJSON(req).catch((e) => e));
    fetchMock.mockResolvedValueOnce(completion("", { message: { content: null, refusal: `No. ${ANSWER}` } }));
    aiErrorResponse(await generateJSON(req).catch((e) => e));
    fetchMock.mockResolvedValueOnce(sse([JSON.stringify({ choices: [{ delta: { refusal: ANSWER }, finish_reason: "stop" }] }), "[DONE]"]));
    await sseResponse(streamJSON(req), { json: true }).text();
    fetchMock.mockResolvedValueOnce(sse([delta(`{"title":"${ANSWER}`), finish("stop"), "[DONE]"]));
    await sseResponse(streamJSON(req), { json: true }).text();
    expect(error).toHaveBeenCalled();
    expectClean();
  });

  it("provider errors keep the type, message and request id, not the rest of the body or a key", async () => {
    const body = JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "Incorrect API key provided: sk-proj-abcdefghijklmnop" }, echo: `${PROMPT} ${ANSWER}` });
    fetchMock
      .mockResolvedValueOnce(new Response(body, { status: 400, headers: { "request-id": "req_123" } }))
      .mockResolvedValueOnce(new Response(body, { status: 500, headers: { "x-request-id": "req_456" } }));
    const err = await generateJSON(req).catch((e) => e);
    aiErrorResponse(err);
    expect(logged()).toContain("400 invalid_request_error: Incorrect API key provided: sk-[redacted] request_id=req_123");
    expect(String(errorFromStatus(500, body, "req_456").detail)).toBe(
      "500 invalid_request_error: Incorrect API key provided: sk-[redacted] request_id=req_456",
    );
    fetchMock.mockResolvedValueOnce(claudeSSE([start, { type: "error", error: { type: "overloaded_error", message: "Overloaded" }, echo: ANSWER }]));
    fetchMock.mockResolvedValueOnce(new Response(body, { status: 503 }));
    await sseResponse(streamText(req)).text();
    expectClean();
  });
});

describe("provider order and the fallback model", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-not-real"));
  const bodyOf = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

  it("fallbackModel picks the OpenAI model; model still picks Claude's", async () => {
    expect(buildBody({ system: "s", user: "u", fallbackModel: "gpt-5.4" }, false).model).toBe("gpt-5.4");
    expect(buildBody({ system: "s", user: "u", model: "gpt-4.1-mini", fallbackModel: "gpt-5.4" }, false).model).toBe("gpt-5.4");
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    await generateJSON({ system: "s", user: "u", schema, model: "claude-sonnet-5-5", fallbackModel: "gpt-5.4" });
    expect(bodyOf(0).model).toBe("claude-sonnet-5-5");
    expect(bodyOf(1).model).toBe("gpt-5.4");
  });

  it('providers ["openai"] pins OpenAI: Claude is never called, and an OpenAI failure is final', async () => {
    fetchMock.mockResolvedValueOnce(completion('{"title":"B","steps":[]}'));
    expect(await generateJSON({ system: "s", user: "u", schema, providers: ["openai"], fallbackModel: "gpt-5.4" })).toEqual({ title: "B", steps: [] });
    expect(urls()).toEqual([OPENAI_URL]);
    expect(bodyOf(0).model).toBe("gpt-5.4");
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 429 }));
    await expect(generateJSON({ system: "s", user: "u", schema, providers: ["openai"] })).rejects.toMatchObject({ code: "busy" });
    expect(urls()).toEqual([OPENAI_URL, OPENAI_URL]);
    // No fallback, but the reason still lands in an "[ai]" line.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[ai] provider: openai failed (busy), no provider left"), expect.anything());
  });

  it('providers ["openai", "anthropic"] reverses the order, with the same fallback rules', async () => {
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(claudeMessage([jsonAnswer({ title: "C", steps: [] })]));
    expect(await generateJSON({ system: "s", user: "u", schema, providers: ["openai", "anthropic"] })).toEqual({ title: "C", steps: [] });
    expect(urls()).toEqual([OPENAI_URL, CLAUDE_URL]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[ai] provider: openai failed (busy), using anthropic"), expect.anything());
  });

  it('providers ["anthropic"] means no fallback, and unknown or repeated entries are ignored', async () => {
    fetchMock.mockResolvedValueOnce(new Response("overloaded", { status: 529 }));
    await expect(generateJSON({ system: "s", user: "u", schema, providers: ["anthropic", "anthropic"] })).rejects.toMatchObject({ code: "unavailable" });
    expect(urls()).toEqual([CLAUDE_URL]);
    fetchMock.mockResolvedValueOnce(claudeMessage([jsonAnswer({ title: "C", steps: [] })]));
    await generateJSON({ system: "s", user: "u", schema, providers: ["bogus" as never] });
    expect(urls()).toEqual([CLAUDE_URL, CLAUDE_URL]);
  });

  it("streams follow the same order", async () => {
    fetchMock.mockResolvedValueOnce(sse([delta("Hi"), finish("stop"), "[DONE]"]));
    expect(await collect(streamText({ system: "s", user: "u", providers: ["openai"], fallbackModel: "gpt-5.4" }))).toBe("Hi");
    expect(urls()).toEqual([OPENAI_URL]);
    expect(bodyOf(0).model).toBe("gpt-5.4");
    fetchMock
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(claudeSSE([start, textDelta("Yo"), stop("end_turn"), end]));
    expect(await collect(streamText({ system: "s", user: "u", providers: ["openai", "anthropic"] }))).toBe("Yo");
    expect(urls()).toEqual([OPENAI_URL, OPENAI_URL, CLAUDE_URL]);
  });
});
