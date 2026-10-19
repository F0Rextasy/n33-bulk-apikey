#!/usr/bin/env node
'use strict';

/**
 * Local OpenAI-compatible bridge for n33.ai.
 *
 * n33.ai speaks its own protocol (multipart in, `data:` event lines out), so
 * nothing that expects `/v1/chat/completions` can talk to it directly. This
 * bridge is that endpoint: point any OpenAI client — or 9Router's
 * `connect-9router.js` — at http://127.0.0.1:20177/v1 and the tokens from
 * keys.txt become ordinary API keys.
 *
 * Usage:
 *   node src/serve.js                 # http://127.0.0.1:20177/v1
 *   node src/serve.js --port 30177
 *   node src/serve.js --proxy socks5h://127.0.0.1:40000
 *
 * Requests are authenticated with any non-empty key; a key that is present in
 * keys.txt is used for that request, otherwise the bridge rotates through the
 * list. Chat calls go out with the key as `Authorization: Bearer <token>`.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const n33 = require('./n33');
const { parseProxy, createAgent } = require('./proxy');

const IS_SRC = path.basename(__dirname) === 'src';
const ROOT = IS_SRC ? path.resolve(__dirname, '..') : __dirname;

const argv = process.argv.slice(2);
const one = (name, dflt) => {
  const hit = argv.find((a) => a === '--' + name || a.startsWith('--' + name + '='));
  if (!hit) return dflt;
  if (hit.includes('=')) return hit.slice(hit.indexOf('=') + 1);
  const next = argv[argv.indexOf(hit) + 1];
  return next === undefined || next.startsWith('--') ? dflt : next;
};
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('node src/serve.js [--port 20177] [--host 127.0.0.1] [--proxy <exit>] [--default-model n33-chat]');
  process.exit(0);
}

const PORT = parseInt(one('port', process.env.N33_SERVE_PORT || '20177'), 10);
const HOST = one('host', '127.0.0.1');
const DEFAULT_MODEL = one('default-model', n33.DEFAULT_MODEL);
const PROXY = one('proxy', process.env.N33_SERVE_PROXY || '')
  ? parseProxy(one('proxy', process.env.N33_SERVE_PROXY))
  : null;

let keys = [];
let cursor = 0;
const loadKeys = () => {
  try {
    keys = fs
      .readFileSync(path.join(ROOT, 'keys.txt'), 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (e) {
    keys = [];
  }
  return keys;
};
loadKeys();
setInterval(loadKeys, 30000).unref();

const nextKey = () => {
  if (!keys.length) loadKeys();
  if (!keys.length) return null;
  const k = keys[cursor % keys.length];
  cursor = (cursor + 1) % keys.length;
  return k;
};

/** Accepts `n33-chat`, `n33/grok`, `n33-grok`, `grok` — anything else falls back. */
function resolveModel(name) {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return DEFAULT_MODEL;
  const flat = raw.replace(/^n33[\/\-]/, '');
  const hit = n33.GUEST_MODELS.find((m) => m.replace(/^n33-/, '') === flat || m === raw);
  return hit || DEFAULT_MODEL;
}

/** The n33 request wants one user turn plus prior turns as `history`. */
function splitMessages(messages) {
  const history = [];
  let content = '';
  for (const m of messages || []) {
    const text = typeof m.content === 'string'
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((p) => (typeof p === 'string' ? p : p && p.text ? p.text : '')).join('')
        : '';
    if (m.role === 'user') {
      if (content) history.push({ role: 'user', content });
      content = text;
    } else if (m.role === 'assistant') {
      if (content) {
        history.push({ role: 'user', content });
        content = '';
      }
      history.push({ role: 'assistant', content: text });
    } else if (text) {
      history.push({ role: 'user', content: text });
    }
  }
  if (!content) {
    const lastUser = [...(messages || [])].reverse().find((m) => m.role === 'user');
    content = typeof lastUser?.content === 'string' ? lastUser.content : 'hello';
  }
  return { content, history: history.slice(-20) };
}

/** Opens the n33 event stream and pushes parsed events to `onEvent`. */
function streamChat(token, { content, history, model }, onEvent, onDone) {
  const boundary = '----n33bulk' + crypto.randomBytes(12).toString('hex');
  const parts = [];
  const field = (name, value) =>
    parts.push(
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"\r\n\r\n' + value + '\r\n')
    );
  field('conversationType', 'chat');
  field('message', JSON.stringify({ content, role: 'user' }));
  field('model', JSON.stringify({ modelId: model }));
  field('history', JSON.stringify(history));
  field('webSearch', 'false');
  field('textChatMode', 'false');
  field('guestKey', crypto.randomUUID());
  parts.push(Buffer.from('--' + boundary + '--\r\n'));
  const body = Buffer.concat(parts);

  const req = https.request(
    {
      method: 'POST',
      host: 'n33.ai',
      port: 443,
      path: '/api/chat/stream',
      agent: PROXY ? createAgent(PROXY) : undefined,
      headers: {
        'User-Agent': n33.UA,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length,
        Authorization: 'Bearer ' + token,
        Origin: n33.BASE,
        Referer: n33.BASE + '/chat',
        Accept: 'text/event-stream',
      },
    },
    (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        let nl;
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            onEvent(JSON.parse(payload));
          } catch (e) {
            /* a malformed frame is skipped, not fatal */
          }
        }
      });
      res.on('end', () => onDone(null, res.statusCode));
      res.on('error', (e) => onDone(e));
    }
  );
  req.setTimeout(120000, () => req.destroy(new Error('upstream timeout')));
  req.on('error', (e) => onDone(e));
  req.write(body);
  req.end();
}

function sendJson(res, status, obj) {
  const text = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

function keyFrom(req) {
  const auth = req.headers.authorization || '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  if (bearer && keys.includes(bearer)) return bearer;
  return nextKey();
}

function usageOf(text) {
  const t = Math.max(1, Math.ceil(String(text).length / 4));
  return { prompt_tokens: 1, completion_tokens: t, total_tokens: t + 1 };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + HOST);
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
    return sendJson(res, 200, { ok: true, keys: keys.length, models: n33.GUEST_MODELS, upstream: n33.BASE });
  }
  if (req.method === 'GET' && url.pathname === '/v1/models') {
    const created = Math.floor(Date.now() / 1000);
    return sendJson(res, 200, {
      object: 'list',
      data: n33.GUEST_MODELS.map((id) => ({ id, object: 'model', created, owned_by: 'n33.ai' })),
    });
  }
  if (req.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
    return sendJson(res, 404, { error: { message: 'not found', type: 'invalid_request_error' } });
  }

  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch (e) {
      return sendJson(res, 400, { error: { message: 'invalid JSON body', type: 'invalid_request_error' } });
    }
    const token = keyFrom(req);
    if (!token) {
      return sendJson(res, 401, {
        error: { message: 'no tokens in keys.txt — run the mint first', type: 'invalid_request_error' },
      });
    }
    const model = resolveModel(body.model);
    const { content, history } = splitMessages(body.messages);
    const id = 'chatcmpl-' + crypto.randomBytes(12).toString('hex');
    const created = Math.floor(Date.now() / 1000);

    if (body.stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      const frame = (delta, finish = null) =>
        'data: ' +
        JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta, finish_reason: finish }],
        }) +
        '\n\n';
      res.write(frame({ role: 'assistant', content: '' }));
      let answered = false;
      streamChat(
        token,
        { content, history, model },
        (ev) => {
          if (ev.error) {
            res.write('data: ' + JSON.stringify({ error: { message: String(ev.error), type: 'upstream_error' } }) + '\n\n');
            return;
          }
          if (ev.chunk) {
            answered = true;
            res.write(frame({ content: ev.chunk }));
          }
        },
        (err, status) => {
          if (err || !answered) {
            const message = err ? err.message : `upstream returned no content (HTTP ${status})`;
            res.write('data: ' + JSON.stringify({ error: { message, type: 'upstream_error' } }) + '\n\n');
          }
          res.write(frame({}, 'stop'));
          res.write('data: [DONE]\n\n');
          res.end();
        }
      );
      return;
    }

    // Buffered path: reuse the client's own parser.
    n33
      .chat(PROXY, token, { model, content, timeoutMs: 120000 })
      .then((r) => {
        if (!r.ok) {
          return sendJson(res, r.status === 401 ? 401 : 502, {
            error: { message: r.error || 'upstream failure', type: 'upstream_error' },
          });
        }
        sendJson(res, 200, {
          id,
          object: 'chat.completion',
          created,
          model: r.model || model,
          choices: [{ index: 0, message: { role: 'assistant', content: r.content }, finish_reason: 'stop' }],
          usage: usageOf(r.content),
        });
      })
      .catch((e) => sendJson(res, 502, { error: { message: e.message, type: 'upstream_error' } }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`n33 OpenAI bridge → http://${HOST}:${PORT}/v1`);
  console.log(`  keys loaded: ${keys.length}${PROXY ? ' · exit ' + PROXY.host + ':' + PROXY.port : ''}`);
  console.log(`  models: ${n33.GUEST_MODELS.join(', ')} (others are served as ${DEFAULT_MODEL})`);
});

module.exports = { resolveModel, splitMessages };
