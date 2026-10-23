<div align="center">

```
███╗   ██╗██████╗ ██████╗
████╗  ██║╚════██╗╚════██╗
██╔██╗ ██║ █████╔╝ █████╔╝
██║╚██╗██║ ╚═══██╗ ╚═══██╗
██║ ╚████║██████╔╝██████╔╝
╚═╝  ╚═══╝╚═════╝ ╚═════╝
```

# n33-bulk-apikey

**Bulk-mint n33.ai guest chat sessions — a captcha-free, mailbox-free rail where every token survived a live chat call, served through a local OpenAI-compatible bridge.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-3-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

N33 AI is a consumer chat product — Claude, GPT and Grok behind one page, a $250/year Pro plan, and **no API-key page at all**. What it does hand out for free is a **guest session**: `POST /api/auth/sign-in/anonymous` answers with a 32-character token and no captcha, no mailbox and no account. That token authenticates the product's own chat (`Authorization: Bearer <token>`) and lives **30 days**. This tool turns that rail into a `keys.txt` of tokens that were each proven with a live completion — and ships the OpenAI-compatible bridge that makes them usable from any client.

## 🎁 Free tier — how much you get

There is no signup credit, no card and no e-mail step on this rail — the free tier **is** the guest session:

| What | Value |
| --- | --- |
| Account needed | **No** — `POST /api/auth/sign-in/anonymous` |
| Captcha / Turnstile | **none** on the sign-in route |
| Mailbox needed | **No** |
| Session lifetime | **30 days** (`/api/auth/get-session` reports `expiresAt`) |
| Chat limit observed | no per-session cap hit: 8 sequential completions on one token, all 200 |
| Mint limit | **~3 sign-ins per window per exit address**, then `429 Too many requests` |
| The unit that scales | **one exit = one account** → `--count N` is really "N guest sessions" |

Because the throttle is per **address**, the pool is what scales this rail: the tool pins one exit to one account, and the pool size caps the useful concurrency. It is also **optional** — with no pool the CLI runs on this machine's own address, one account at a time.

> 💡 The free tier is set by N33 AI and can change. Check the live numbers at [n33.ai](https://n33.ai) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 3 of them

Guests are not offered the whole catalogue: the Pro-only ids (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) are **silently substituted** with `n33-chat` rather than refused — the `done` event names the model that really answered. Three ids answer as themselves:

| Model id | Served as | Notes |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | the free default, always available |
| `n33-grok` | Grok | free rung of the xAI family |
| `n33-gpt` | GPT | free rung of the OpenAI family |

Anything else in the catalogue is accepted by the endpoint but answered by `n33-chat`.

## 🧪 How to use the API

N33 AI speaks its own protocol — a multipart `POST /api/chat/stream` that answers in `data: {...}` event lines — so nothing that expects OpenAI can talk to it directly. **`src/serve.js` is that endpoint**: point any OpenAI client at it and the tokens in `keys.txt` behave like ordinary API keys.

```bash
# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

The bridge serves `n33-chat`, `n33-grok` and `n33-gpt`, supports streaming (`"stream": true`), rotates across `keys.txt` automatically, and accepts any non-empty key — a key that is in `keys.txt` is used for that request, anything else round-robins.

Talking to the product directly is also possible; the token is a plain bearer credential:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Quick start

```bash
# clone or fork this repository, then:
cd n33-bulk-apikey

# 1) optional: your proxy list, one per line (http://… or socks5://…)
#    skip this and the CLI connects directly
printf 'socks5h://127.0.0.1:1080\n' > proxies.txt

# 2) go
node src/launcher.js        # interactive
# or directly:
node src/cli.js --count 100 --conc 6

# 3) use the tokens
node src/serve.js           # OpenAI-compatible bridge on 127.0.0.1:20177
```

`keys.txt` is written **only** after a live chat completion proves the token.

### 🖱️ The launcher

The launcher asks for the proxy list, the count and the verification model, remembers them in `launcher.config.json`, and runs the CLI with the right flags. Its `Connect to 9Router` item registers the keys through the bridge.

## ✅ Verified working — every key is tested

> **Quality gates.** Every key here passed a live `chat-200` before it was written to `keys.txt`
> (dead keys are never shipped). Router combos follow the same rule at the model level: an entry is
> added **only if the model answers `chat-200` and can call tools** — a model without tool support,
> a dead key or a dead provider is dropped instead of added. Works with **9Router and OmniRoute**.

Every claim below was measured against the live site on **2026-10-19**.

| Check | Result |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — 32-char token, no captcha, no mailbox |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` **30 days** out |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (no header) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — `data:` chunks, then `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (no auth) | **401** `{"error":"Unauthorized"}` |
| 8 sequential completions, one token | **8 × 200** — no per-session cap reached |
| Pro-only model ids | **200**, answered by `n33-chat` (silent substitution) |
| sign-in burst from one address | **429** after ~3 in a window — the tool paces and retries |
| a token that fails its chat check | never written to `keys.txt`; the account is recorded in `accounts.json` |
| local bridge `POST /v1/chat/completions` | **200** — buffered and `stream: true` both verified |

Re-check at any time:

```bash
node src/cli.js --verify-only
```

## 🧭 How it works

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Step | Call | Notes |
| --- | --- | --- |
| sign-in | `POST /api/auth/sign-in/anonymous` | better-auth guest route; returns `{token, user}` |
| auth | `Authorization: Bearer <token>` | the cookie jar is *not* required — the bearer form is accepted |
| read-back | `GET /api/auth/get-session` | session record, `expiresAt` = +30 days |
| chat | `POST /api/chat/stream` | multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| answer | `data: {"chunk":…}` … `{"done":true,"model":…}` | the `model` field reports the id that really served it |
| check | 200 **and** text **and** `done` | anything less never reaches `keys.txt` |
| serve | `node src/serve.js` | translates that protocol into OpenAI `/v1/chat/completions` |

## ⚙️ CLI options

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the pool (or the direct route) against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--count` | `50` | how many guest sessions to mint |
| `--model` | `n33-chat` | model used for the live verification |
| `--conc` | `4` | accounts in flight (capped by the pool size — `1` in direct mode) |
| `--gap` | `0.5` | seconds to wait after each account |
| `--retries` | `6` | attempts per account (429 is retried with backoff) |
| `--proxies` | `proxies.txt` | proxy list file — **optional**, without it the tool connects directly |
| `N33_PROXIES` | — | environment override for the list path — **optional** |

## 🛰️ Behind a proxy

**Optional — recommended at scale (per-IP limits, bans).** The tool works without a proxy too.

- **With a pool:** pass `--proxies <file>` (or set `N33_PROXIES`) and every request goes through a line from that list, with **one line pinned to one account**: the sign-in throttle is per address, so hopping exits mid-flight is what produces needless 429s. A dead line fails that account and the tool moves on — fail-closed while a pool is provided, never a silent direct fallback — and `--screen` tells you which lines reach `n33.ai:443` before you spend a run on them.
- **Without a pool:** the CLI prints `running WITHOUT a proxy (direct)` and connects directly. Nothing about sign-in, the live chat proof or `keys.txt` changes — only where the packets leave from. One address means the throttle (~3 sign-ins per window) caps the run at `conc 1`, and `--screen` then tests the direct route.

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | one live-verified guest token per line — git-ignored |
| `accounts.json` | exit / token / chat status per account |
| `proxies.txt` | your exits, one per line — git-ignored |
| `outputs/` | run log — git-ignored |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router. Because n33.ai is not OpenAI-shaped, the bridge is what 9Router talks to — start it first, then register the keys:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Models are then served as `n33/<model id>` and load-balanced across every token; each connection carries a token from `keys.txt`, which the bridge uses for that request.

## 🔌 Connect to OmniRoute

[OmniRoute](https://omniroute.online) is a self-hosted, OpenAI-compatible router. Because n33.ai is not OpenAI-shaped, the bridge is what OmniRoute talks to — start it first, then register the keys:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-omniroute.js    # registers the provider node + one connection per key
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Models are then served as `n33/<model id>` and load-balanced across every token; each connection carries a token from `keys.txt`, which the bridge uses for that request.

## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 What the provider gives | a **guest session**: no account, no captcha, no mailbox — a 32-character token that lives 30 days |
| 🔑 What one token gets you | one guest session with its own identity, served through the bundled bridge; there is no quota to spend, only the panel's per-address sign-in throttle |
| 🌐 API shape | OpenAI-compatible **through the bundled bridge**: `POST http://127.0.0.1:20177/v1/chat/completions` (the product itself answers a multipart `POST /api/chat/stream`) |
| 🔒 Your data | only `n33.ai`, the proxies you configure and the local bridge are involved; tokens stay on your machine |

## 🐞 Issues

If the panel changes its sign-in route, its throttle or its stream framing, the tool stops at that step and says so — `node src/cli.js --verify-only` is the fastest way to see which half broke. **[Open an issue](../../issues)** with the command you ran and the exact output; PRs are welcome.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 n33-bulk-apikey contributors

</div>
