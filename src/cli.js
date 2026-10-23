#!/usr/bin/env node
'use strict';

/**
 * n33-bulk — mint live n33.ai chat credentials.
 *
 * n33.ai has no key page and no OpenAI-compatible endpoint, so the credential
 * this tool produces is the thing that authenticates its chat: the 32-character
 * guest session token from `POST /api/auth/sign-in/anonymous`. It works as
 * `Authorization: Bearer <token>` and lives 30 days.
 *
 * A token is written to `keys.txt` only after `POST /api/chat/stream` answered
 * 200 with real content — the same rule every repo in this family follows.
 *
 * Usage:
 *   node src/cli.js --count 100                 # mint (default 50)
 *   node src/cli.js --count 100 --conc 6        # how many accounts at once
 *   node src/cli.js --verify-only               # re-check keys.txt
 *   node src/cli.js --screen                    # test the pool (or direct) against n33.ai
 *   node src/cli.js --help
 *
 * Files (repo root):
 *   proxies.txt     your exits, one per line   (optional — or N33_PROXIES=<file>)
 *   keys.txt        one live-verified token per line
 *   accounts.json   one record per account
 *   outputs/        run log
 *
 * The proxy list is OPTIONAL: with --proxies (or the N33_PROXIES env) every
 * request goes through an exit from your pool; with no pool the CLI prints
 * `running WITHOUT a proxy (direct)` and connects directly.
 */

const fs = require('fs');
const path = require('path');
const { loadPoolFile, proxyForIndex, openTunnel, label } = require('./proxy');
const n33 = require('./n33');

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
const flag = (name) => argv.includes('--' + name);

if (flag('help') || flag('h')) {
  fs.writeSync(1, `n33-bulk — mint live n33.ai guest chat tokens

Usage: node src/cli.js [options]

  --count N        accounts/keys to mint            (default 50)
  --model id       model used for the live check    (default ${n33.DEFAULT_MODEL})
  --conc N         accounts in flight               (default 4)
  --gap S          seconds to wait after an account (default 0.5)
  --proxies FILE   proxy list (default proxies.txt; env N33_PROXIES) [optional]
  --retries N      attempts per account             (default 6)
  --verify-only    re-check every token in keys.txt
  --screen         probe the proxy list for exits that reach n33.ai
  --help

Environment:
  N33_PROXIES      proxy list path (wins over the default, not over --proxies) [optional]

Guest sessions are rate-limited per exit address, so the pool size caps the
useful concurrency: one account is pinned to one exit and never hops.

Requests go through your proxy list when one is provided (--proxies /
N33_PROXIES). Without a pool the tool connects directly.
`);
  process.exit(0);
}

const COUNT = Math.max(1, parseInt(one('count', '50'), 10) || 50);
const MODEL = one('model', n33.DEFAULT_MODEL);
const RETRIES = Math.max(1, parseInt(one('retries', '6'), 10) || 6);
const GAP_MS = Math.max(0, Math.round((parseFloat(one('gap', '0.5')) || 0) * 1000));
const PROXY_FILE = path.resolve(process.cwd(), one('proxies', process.env.N33_PROXIES || 'proxies.txt'));

const KEYS = path.join(ROOT, 'keys.txt');
const ACCOUNTS = path.join(ROOT, 'accounts.json');
const LOGDIR = path.join(ROOT, 'outputs');
fs.mkdirSync(LOGDIR, { recursive: true });
const LOG = path.join(LOGDIR, 'mint.log');

/** Dead-key report: only definite rejections — 429/5xx/transport never land here. */
const DEAD_FILE = path.join(ROOT, 'keys-dead.txt');
const DEAD_STATUS = new Set([401, 403]);
const DEAD_REASON = /banned|deactivated|disabled|suspended|quota|insufficient|forbidden|unauthorized/i;
function recordDead(key, status, sample) {
  if (!key) return;
  if (!DEAD_STATUS.has(Number(status)) && !DEAD_REASON.test(String(sample || ''))) return;
  const why = `${status}${sample ? ' ' + String(sample).replace(/\s+/g, ' ').slice(0, 60) : ''}`;
  try {
    fs.mkdirSync(path.dirname(DEAD_FILE), { recursive: true });
    fs.appendFileSync(DEAD_FILE, `${key}\t${why}\t${new Date().toISOString()}\n`);
  } catch (e) { /* diagnostics must never break the run */ }
}

const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base) => base + Math.floor(Math.random() * 250);
/**
 * Progress goes out synchronously. On Windows `console.log` to a redirected
 * file is asynchronous and a long run's tail can be lost outright — which is
 * exactly how a healthy verify pass lost one result line and its summary.
 * `fs.writeSync(1, …)` keeps the order and the bytes.
 */
const say = (text) => {
  try {
    fs.writeSync(1, text + '\n');
  } catch (e) {
    /* a closed pipe must not abort a run mid-flight */
  }
};
const log = (msg) => {
  const line = `[${nowIso()}] ${msg}`;
  say(line);
  try {
    fs.appendFileSync(LOG, line + '\n');
  } catch (e) {
    /* a full disk must not stop a run */
  }
};
const maskExit = (line) => String(line || 'direct').replace(/:[^:@/]+@/, ':***@');

/**
 * The pool is optional. No file, or a file with no usable line, means DIRECT
 * mode: the exit list becomes the single `null` sentinel, which every consumer
 * here already understands — `label()` reads it as `(direct)`, `openTunnel()`
 * returns a plain socket and `n33.request()` skips the proxy agent. Fail-closed
 * still rules the moment a pool *is* given: a dead exit fails that account and
 * is never quietly swapped for a direct connection.
 */
function loadExits() {
  if (!fs.existsSync(PROXY_FILE)) {
    say(
      `no proxy list at ${PROXY_FILE} — running WITHOUT a proxy (direct). ` +
        'Put exits there (or pass --proxies) to route through them.'
    );
    return [null];
  }
  const exits = loadPoolFile(PROXY_FILE);
  if (!exits.length) {
    say(`${PROXY_FILE} has no usable proxy line — running WITHOUT a proxy (direct).`);
    say('  one exit per line: http://host:port, socks5://host:port or host:port');
    return [null];
  }
  return exits;
}
const EXITS = loadExits();
const DIRECT = EXITS[0] === null;
/**
 * One exit per in-flight account: sharing an address is what trips the 429
 * bucket. Without a pool every account shares this machine's one address, so
 * the run stays serial.
 */
const CONC = Math.max(1, Math.min(parseInt(one('conc', '4'), 10) || 4, EXITS.length));

const readKeys = () => {
  try {
    return fs
      .readFileSync(KEYS, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (e) {
    return [];
  }
};
const appendKey = (token) => {
  fs.appendFileSync(KEYS, token + '\n');
};
const readAccounts = () => {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS, 'utf8'));
  } catch (e) {
    return [];
  }
};
const saveAccount = (rec) => {
  const all = readAccounts();
  all.push(rec);
  fs.writeFileSync(ACCOUNTS, JSON.stringify(all, null, 2) + '\n');
};

/** 429 is the panel's own pacing signal: back off, do not count it a failure. */
async function mintWithRetries(proxy, tries) {
  let wait = 700;
  let last = { ok: false, status: 0, error: 'no attempt' };
  for (let i = 0; i < tries; i++) {
    let res;
    try {
      res = await n33.mintSession(proxy);
    } catch (e) {
      res = { ok: false, status: 0, error: e.message, retryable: true };
    }
    if (res.ok) return res;
    last = res;
    if (!res.retryable) return res;
    log(`   sign-in ${res.status || 'err'} (${res.error || ''}) — retry in ${wait}ms`);
    await sleep(jitter(wait));
    wait = Math.min(wait * 2, 8000);
  }
  return last;
}

/** Live proof: 200 + text + done. One retry on a transport/temporary failure. */
async function verifyWithRetries(proxy, token, tries = 2) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = await n33.chat(proxy, token, { model: MODEL, content: 'Reply with exactly: N33-PONG' });
    if (last.ok) return last;
    if (!last.retryable) return last;
    await sleep(jitter(1200));
  }
  return last;
}

let nextIndex = 0;
let live = 0;
let failed = 0;
let spentMs = 0;
const startedAll = Date.now();

async function worker(id) {
  for (;;) {
    const index = nextIndex++;
    if (index >= COUNT) return;
    const proxy = proxyForIndex(EXITS, index);
    const tag = `#${String(index + 1).padStart(3, '0')} w${id} ${maskExit(label(proxy))}`;
    const t0 = Date.now();
    const minted = await mintWithRetries(proxy, RETRIES);
    if (!minted.ok) {
      failed++;
      log(`${tag} MINT FAIL status=${minted.status || 'err'} ${minted.error || ''}`);
      saveAccount({
        index: index + 1,
        exit: maskExit(label(proxy)),
        status: 'mint-failed',
        httpStatus: minted.status || 0,
        error: minted.error || null,
        at: nowIso(),
      });
      await sleep(jitter(GAP_MS));
      continue;
    }
    const token = minted.token;
    const proof = await verifyWithRetries(proxy, token);
    const ms = Date.now() - t0;
    if (!proof.ok) {
      failed++;
      log(`${tag} CHAT FAIL status=${proof.status} ${proof.error || ''} (${ms}ms)`);
      saveAccount({
        index: index + 1,
        exit: maskExit(label(proxy)),
        status: 'chat-failed',
        httpStatus: proof.status,
        token: null,
        error: proof.error || null,
        at: nowIso(),
      });
      await sleep(jitter(GAP_MS));
      continue;
    }
    live++;
    spentMs += ms;
    if (!readKeys().includes(token)) appendKey(token);
    saveAccount({
      index: index + 1,
      exit: maskExit(label(proxy)),
      status: 'live',
      token,
      model: proof.model,
      ms,
      reply: (proof.content || '').slice(0, 60),
      at: nowIso(),
    });
    log(`${tag} LIVE model=${proof.model} ${ms}ms -> ${(proof.content || '').slice(0, 40)}`);
    await sleep(jitter(GAP_MS));
  }
}

async function screen() {
  log(`screening ${DIRECT ? 'the direct route' : `${EXITS.length} exits`} against n33.ai:443`);
  // Collected, then printed in list order: concurrent progress lines interleave
  // and a redirected tail can drop them.
  const rows = new Array(EXITS.length);
  await Promise.all(
    EXITS.map(async (proxy, i) => {
      const r = await openTunnel(proxy, { host: 'n33.ai', port: 443, timeoutMs: 12000 })
        .then((sock) => {
          sock.destroy();
          return { ok: true };
        })
        .catch((e) => ({ ok: false, error: e.message }));
      rows[i] = `  ${String(i + 1).padStart(3)} ${maskExit(label(proxy))} ${r.ok ? 'live' : 'dead ' + (r.error || '')}`;
    })
  );
  const ok = rows.filter((r) => r.endsWith('live')).length;
  say(rows.join('\n'));
  say(`\n  ${ok}/${EXITS.length} reach n33.ai`);
}

/**
 * `process.exit()` drops stdout that is still buffered — with the output
 * redirected to a file, the last lines (the summary, a late result) vanish.
 * Setting `exitCode` and letting a short ref'd timer force the exit after the
 * streams drain keeps both the output and a bounded lifetime under lingering
 * proxy sockets.
 */
function finish(code) {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 1200);
}

async function verifyOnly() {
  const keys = readKeys();
  if (!keys.length) {
    say(`! no keys in ${KEYS}`);
    return finish(1);
  }
  // Durable record: a long run's stdout tail is not something to trust twice.
  const VL = path.join(LOGDIR, 'verify.log');
  const record = (line) => {
    say(line);
    try {
      fs.appendFileSync(VL, line + '\n');
    } catch (e) {
      /* a full disk must not stop a run */
    }
  };
  log(`verifying ${keys.length} keys (model ${MODEL})`);
  let good = 0;
  let refused = 0;
  let unreachable = 0;
  let i = 0;
  const results = new Array(keys.length);
  const runOne = async () => {
    for (;;) {
      const index = i++;
      if (index >= keys.length) return;
      const token = keys[index];
      const proxy = proxyForIndex(EXITS, index);
      const proof = await verifyWithRetries(proxy, token);
      let row;
      if (proof.ok) {
        good++;
        row = `  ok      ${token.slice(0, 8)}… model=${proof.model} ${proof.ms}ms`;
      } else if (proof.status === 0) {
        // No HTTP answer at all: the exit died before the panel ever saw the
        // token, so this says nothing about the token. Counting it as a dead
        // key is how a healthy keylist gets trimmed for no reason.
        unreachable++;
        row = `  exit    ${token.slice(0, 8)}… untested — ${maskExit(label(proxy))} ${proof.error || ''}`;
      } else {
        refused++;
        recordDead(token, proof.status, proof.error);
        row = `  dead    ${token.slice(0, 8)}… status=${proof.status} ${proof.error || ''}`;
      }
      results[index] = row;
      record(row);
    }
  };
  await Promise.all(Array.from({ length: CONC }, runOne));
  record(`\n  ${good}/${keys.length} keys answered a live chat · ${refused} refused by the panel · ${unreachable} untested (exit failed)`);
  try {
    fs.writeFileSync(path.join(LOGDIR, 'verify-results.json'), JSON.stringify({ at: nowIso(), keys: keys.length, good, refused, unreachable, model: MODEL, results }, null, 2) + '\n');
  } catch (e) {
    /* the log line above already carries the verdict */
  }
  finish(refused ? 1 : 0);
}

async function main() {
  if (flag('screen')) return screen();
  if (flag('verify-only')) return verifyOnly();

  log(
    `n33-bulk — count=${COUNT} conc=${CONC} model=${MODEL} ` +
      `exits=${DIRECT ? 'direct' : EXITS.length} (${PROXY_FILE})`
  );
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i + 1)));
  const secs = (Date.now() - t0) / 1000;
  const per = live ? (secs / live).toFixed(1) : '—';
  log(`done: ${live} live, ${failed} failed in ${secs.toFixed(0)}s (${per} s/key)`);
  say(`\n  keys.txt: ${readKeys().length} live-verified token(s)`);
  say(`  ${live} minted this run · ${per} s/key · log: outputs/mint.log`);
  finish(live > 0 ? 0 : 1);
}

main().catch((e) => {
  say('[fatal] ' + (e && e.stack ? e.stack : e));
  finish(1);
});
