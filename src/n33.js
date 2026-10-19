'use strict';

/**
 * n33.ai protocol client — session mint, live chat, session read-back.
 *
 * n33.ai is a consumer chat product, not a New-API panel: there is no
 * OpenAI-compatible `/v1` surface and no key page. What it does have is a
 * guest rail — `POST /api/auth/sign-in/anonymous` (better-auth) hands back a
 * 32-character session token, and that token authenticates both the JSON API
 * (`Authorization: Bearer <token>`) and the chat stream.
 *
 * Measured 2026-10-19 against the live site:
 *
 *   POST /api/auth/sign-in/anonymous          -> 200 {"token":"<32 hex-ish>","user":{...}}
 *   GET  /api/auth/get-session  (Bearer)      -> 200, session.expiresAt = +30 days
 *   GET  /api/v1/me             (Bearer)      -> 200 {"user":{"type":"guest",...}}
 *   POST /api/chat/stream       (Bearer)      -> 200 text/event-stream
 *   POST /api/chat/stream       (no auth)     -> 401 {"error":"Unauthorized"}
 *
 * The chat call is multipart/form-data, not JSON: `message`, `model`, `history`,
 * `webSearch`, `textChatMode`, `guestKey`. Answers arrive as `data: {...}` lines
 * that carry `chunk` / `fullText` and end with `{"done":true,"model":"<id>"}`.
 *
 * Two cost notes that shape every caller:
 *  - sign-in is rate-limited per client address (a short token bucket: roughly
 *    three sign-ins per window, then 429), so callers pace and retry;
 *  - Pro-only model ids are not refused, they are silently substituted with
 *    `n33-chat` — the `done` event always names the model that really answered.
 */

const crypto = require('crypto');
const { createAgent } = require('./proxy');

const BASE = 'https://n33.ai';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

/** Model ids a guest session can actually reach. Anything else answers as `n33-chat`. */
const GUEST_MODELS = ['n33-chat', 'n33-grok', 'n33-gpt'];

/** Every model id the product advertises; `→` marks the guest substitute. */
const KNOWN_MODELS = [
  ...GUEST_MODELS,
  'n33-claude-sonnet',
  'n33-claude-opus',
  'n33-claude-fable',
  'n33-gpt-terra',
  'n33-gpt-sol',
  'n33-gpt-astra',
  'n33-gpt-5-5',
  'n33-grok-4-6',
  'n33-grok-4-7',
];

const DEFAULT_MODEL = 'n33-chat';

/**
 * One HTTPS request through `proxy` (or direct when it is null).
 * The response body is returned as text whatever the status.
 */
function request(proxy, { method = 'GET', path, headers = {}, body = null, timeoutMs = 45000 }) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const payload =
      body === null || body === undefined ? null : Buffer.isBuffer(body) ? body : Buffer.from(body);
    const finalHeaders = { 'User-Agent': UA, Accept: '*/*', ...headers };
    if (payload && !Object.keys(finalHeaders).some((h) => h.toLowerCase() === 'content-length')) {
      finalHeaders['Content-Length'] = payload.length;
    }
    const req = https.request(
      {
        method,
        host: 'n33.ai',
        port: 443,
        path,
        agent: proxy ? createAgent(proxy) : undefined,
        headers: finalHeaders,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout after ' + timeoutMs + 'ms')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** JSON POST helper that keeps the raw text for the error path. */
async function postJson(proxy, path, obj, { token = null, timeoutMs = 30000 } = {}) {
  const body = JSON.stringify(obj || {});
  const headers = {
    'Content-Type': 'application/json',
    Origin: BASE,
    Referer: BASE + '/chat',
  };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await request(proxy, { method: 'POST', path, headers, body, timeoutMs });
  let json = null;
  try {
    json = JSON.parse(res.text);
  } catch (e) {
    /* non-JSON answers (Cloudflare 429 pages) stay as text */
  }
  return { ...res, json };
}

/**
 * `POST /api/auth/sign-in/anonymous` — the whole mint.
 *
 * Returns `{ token, user, raw }` on 200. A 429 is reported as
 * `{ status: 429 }` so the caller can pace instead of counting it a failure of
 * the panel; anything else surfaces the body.
 */
async function mintSession(proxy, { timeoutMs = 30000 } = {}) {
  const res = await postJson(proxy, '/api/auth/sign-in/anonymous', {}, { timeoutMs });
  if (res.status === 200 && res.json && res.json.token) {
    return { ok: true, status: 200, token: res.json.token, user: res.json.user || null };
  }
  return {
    ok: false,
    status: res.status,
    retryable: res.status === 429 || res.status >= 500 || res.status === 0,
    error: (res.json && (res.json.message || res.json.error)) || res.text.slice(0, 160),
  };
}

/** `GET /api/auth/get-session` — token check plus the session expiry. */
async function getSession(proxy, token, { timeoutMs = 30000 } = {}) {
  const res = await request(proxy, {
    method: 'GET',
    path: '/api/auth/get-session',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    timeoutMs,
  });
  let json = null;
  try {
    json = JSON.parse(res.text);
  } catch (e) {
    /* keep text */
  }
  return { status: res.status, json, text: res.text.slice(0, 200) };
}

/** `GET /api/v1/me` — the cheapest authenticated probe. */
async function me(proxy, token, { timeoutMs = 30000 } = {}) {
  const res = await request(proxy, {
    method: 'GET',
    path: '/api/v1/me',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    timeoutMs,
  });
  let json = null;
  try {
    json = JSON.parse(res.text);
  } catch (e) {
    /* keep text */
  }
  return { status: res.status, json, text: res.text.slice(0, 200) };
}

/** Builds the multipart body the web client sends. */
function buildChatBody({ content, model, history = [], webSearch = false, textChatMode = false, guestKey = null }) {
  const boundary = '----n33bulk' + crypto.randomBytes(12).toString('hex');
  const parts = [];
  const field = (name, value) => {
    parts.push(
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"\r\n\r\n' + value + '\r\n')
    );
  };
  field('conversationType', 'chat');
  field('message', JSON.stringify({ content, role: 'user' }));
  field('model', JSON.stringify({ modelId: model || DEFAULT_MODEL }));
  field('history', JSON.stringify(history));
  field('webSearch', JSON.stringify(!!webSearch));
  field('textChatMode', JSON.stringify(!!textChatMode));
  field('guestKey', guestKey || crypto.randomUUID());
  parts.push(Buffer.from('--' + boundary + '--\r\n'));
  return { body: Buffer.concat(parts), contentType: 'multipart/form-data; boundary=' + boundary };
}

/** Reads the `data: {...}` lines out of a buffered event stream. */
function parseStream(text) {
  const chunks = [];
  let fullText = '';
  let model = null;
  let done = false;
  let status = null;
  const errors = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    let json;
    try {
      json = JSON.parse(payload);
    } catch (e) {
      continue;
    }
    if (json.status) status = json.status;
    if (typeof json.chunk === 'string' && json.chunk) chunks.push(json.chunk);
    if (typeof json.fullText === 'string') fullText = json.fullText;
    if (json.model) model = json.model;
    if (json.done) done = true;
    if (json.error) errors.push(typeof json.error === 'string' ? json.error : JSON.stringify(json.error));
  }
  return { chunks, fullText, model, done, status, error: errors[0] || null };
}

/**
 * `POST /api/chat/stream` — one live completion.
 *
 * Returns `{ status, ok, content, model, ms, retryable }`; `ok` is true only
 * for a 200 that produced text and a `done` event.
 */
async function chat(proxy, token, { model = DEFAULT_MODEL, content = 'Say OK', timeoutMs = 90000 } = {}) {
  const started = Date.now();
  const { body, contentType } = buildChatBody({ content, model });
  const headers = {
    'Content-Type': contentType,
    Origin: BASE,
    Referer: BASE + '/chat',
    Accept: 'text/event-stream',
    Authorization: 'Bearer ' + token,
  };
  let res;
  try {
    res = await request(proxy, { method: 'POST', path: '/api/chat/stream', headers, body, timeoutMs });
  } catch (e) {
    return { status: 0, ok: false, error: e.message, ms: Date.now() - started, retryable: true };
  }
  const parsed = parseStream(res.text);
  const ok = res.status === 200 && parsed.done && !!parsed.fullText;
  return {
    status: res.status,
    ok,
    content: parsed.fullText || res.text.slice(0, 200),
    model: parsed.model || null,
    ms: Date.now() - started,
    retryable: !ok && (res.status === 429 || res.status >= 500 || res.status === 0),
    error: ok ? null : (parsed.error || res.text.slice(0, 160).replace(/\s+/g, ' ')),
  };
}

module.exports = {
  BASE,
  UA,
  DEFAULT_MODEL,
  GUEST_MODELS,
  KNOWN_MODELS,
  request,
  postJson,
  mintSession,
  getSession,
  me,
  chat,
  parseStream,
  buildChatBody,
};
