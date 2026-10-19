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

**n33.ai 게스트 채팅 세션을 대량으로 발급합니다 — 캡차도, 메일함도 필요 없는 경로이며, 모든 토큰은 실제 채팅 호출로 검증되었고, 로컬 OpenAI 호환 브리지를 통해 제공됩니다.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 등급](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-3-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 동작 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 이 도구가 존재하는 이유

N33 AI는 소비자용 채팅 제품입니다 — Claude, GPT, Grok이 한 페이지 뒤에 있고, 연 $250의 Pro 요금제가 있으며, **API 키 페이지는 아예 없습니다**. 대신 무료로 제공하는 것은 **게스트 세션**입니다: `POST /api/auth/sign-in/anonymous`가 32자 토큰을 돌려주며, 캡차도, 메일함도, 계정도 필요 없습니다. 그 토큰은 제품 자체의 채팅을 인증하고(`Authorization: Bearer <token>`), **30일** 동안 유지됩니다. 이 도구는 그 경로를 각각 실제 완료 호출로 입증된 토큰들의 `keys.txt`로 바꾸고, 어떤 클라이언트에서든 쓸 수 있게 해주는 OpenAI 호환 브리지를 함께 제공합니다.

## 🎁 무료 등급 — 얼마나 받을 수 있나

이 경로에는 가입 크레딧도, 카드도, 이메일 단계도 없습니다 — 무료 등급은 바로 **게스트 세션**입니다:

| 항목 | 값 |
| --- | --- |
| 필요한 계정 | **없음** — `POST /api/auth/sign-in/anonymous` |
| 캡차 / Turnstile | 로그인 경로에서는 **없음** |
| 필요한 메일함 | **없음** |
| 세션 수명 | **30일** (`/api/auth/get-session`이 `expiresAt`을 보고) |
| 관측된 채팅 한도 | 세션당 상한에 도달하지 않음: 한 토큰으로 순차 완료 8회, 전부 200 |
| 발급 한도 | **출구 주소당 창(window)마다 약 3회 로그인**, 이후 `429 Too many requests` |
| 확장되는 단위 | **출구 하나 = 계정 하나** → `--count N`은 사실상 "게스트 세션 N개" |

스로틀이 **주소** 단위이기 때문에 여기서 프록시 풀은 사치가 아닙니다: 도구는 출구 하나를 계정 하나에 고정하며, 풀 크기가 실용적인 동시성의 상한이 됩니다.

> 💡 무료 등급은 N33 AI가 정하며 바뀔 수 있습니다. 실시간 수치는 [n33.ai](https://n33.ai)에서 확인하세요 — 그리고 도구 자체의 게이트가 판단하게 하세요:

```bash
node src/cli.js --verify-only     # keys.txt의 모든 토큰을 실제 채팅 호출로 재검사
```

## 🤖 모델 — 딱 3개

게스트에게 전체 카탈로그가 제공되지는 않습니다: Pro 전용 id(`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`)는 거부되지 않고 **조용히 `n33-chat`으로 대체**됩니다 — `done` 이벤트가 실제로 응답한 모델을 알려줍니다. 세 개의 id는 자기 자신으로 응답합니다:

| 모델 id | 제공되는 모델 | 비고 |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | 무료 기본값, 항상 사용 가능 |
| `n33-grok` | Grok | xAI 계열의 무료 등급 |
| `n33-gpt` | GPT | OpenAI 계열의 무료 등급 |

카탈로그의 다른 무엇이든 엔드포인트는 받아들이지만 `n33-chat`이 응답합니다.

## 🧪 API 사용 방법

N33 AI는 자체 프로토콜을 씁니다 — `data: {...}` 이벤트 라인으로 응답하는 multipart `POST /api/chat/stream` — 따라서 OpenAI를 기대하는 무엇도 직접 대화할 수 없습니다. **`src/serve.js`가 바로 그 엔드포인트입니다**: 어떤 OpenAI 클라이언트든 여기에 연결하면 `keys.txt`의 토큰이 평범한 API 키처럼 동작합니다.

```bash
# 터미널 1 — 브리지 (기본값 http://127.0.0.1:20177/v1)
node src/serve.js

# 터미널 2 — OpenAI 형식의 아무 요청
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

브리지는 `n33-chat`, `n33-grok`, `n33-gpt`를 제공하고, 스트리밍(`"stream": true`)을 지원하며, `keys.txt` 전체를 자동으로 순환하고, 비어 있지 않은 키는 무엇이든 받아들입니다 — `keys.txt`에 있는 키는 해당 요청에 사용되고, 그 외의 것은 라운드로빈으로 처리됩니다.

제품과 직접 대화하는 것도 가능합니다; 토큰은 평범한 베어러 자격 증명입니다:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 빠른 시작

```bash
# clone or fork this repository, then:
cd n33-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…)
printf 'socks5h://127.0.0.1:1080\n' > proxies.txt

# 2) go
node src/launcher.js        # interactive
# or directly:
node src/cli.js --count 100 --conc 6

# 3) use the tokens
node src/serve.js           # OpenAI-compatible bridge on 127.0.0.1:20177
```

`keys.txt`는 실제 채팅 완료가 토큰을 입증한 **뒤에만** 기록됩니다.

### 🖱️ 런처

런처는 프록시 목록, 개수, 검증 모델을 물어보고 이를 `launcher.config.json`에 기억해 두었다가, 알맞은 플래그로 CLI를 실행합니다. `Connect to 9Router` 항목은 브리지를 통해 키를 등록합니다.

## ✅ 검증된 동작 — 모든 키가 테스트됩니다

아래의 모든 주장은 **2026-10-19**에 실제 사이트를 대상으로 측정되었습니다.

| 확인 항목 | 결과 |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — 32자 토큰, 캡차 없음, 메일함 없음 |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt`이 **30일** 뒤 |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (헤더 없음) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — `data:` 청크들, 이어서 `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (인증 없음) | **401** `{"error":"Unauthorized"}` |
| 한 토큰으로 순차 완료 8회 | **8 × 200** — 세션당 상한에 도달하지 않음 |
| Pro 전용 모델 id | **200**, `n33-chat`이 응답 (조용한 대체) |
| 한 주소에서의 로그인 연타 | 창 내 약 3회 후 **429** — 도구는 간격을 두고 재시도 |
| 채팅 검사에 실패한 토큰 | `keys.txt`에 절대 기록되지 않음; 해당 계정은 `accounts.json`에 기록됨 |
| 로컬 브리지 `POST /v1/chat/completions` | **200** — 버퍼링 및 `stream: true` 모두 검증됨 |

언제든 재확인할 수 있습니다:

```bash
node src/cli.js --verify-only
```

## 🧭 동작 방식

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| 단계 | 호출 | 비고 |
| --- | --- | --- |
| 로그인 | `POST /api/auth/sign-in/anonymous` | better-auth 게스트 경로; `{token, user}` 반환 |
| 인증 | `Authorization: Bearer <token>` | 쿠키 저장소는 *필요 없음* — 베어러 형식이 허용됨 |
| 읽기 확인 | `GET /api/auth/get-session` | 세션 레코드, `expiresAt` = +30일 |
| 채팅 | `POST /api/chat/stream` | multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| 응답 | `data: {"chunk":…}` … `{"done":true,"model":…}` | `model` 필드가 실제로 서비스한 id를 보고 |
| 검사 | 200 **그리고** 텍스트 **그리고** `done` | 이에 미치지 못하면 `keys.txt`에 절대 도달하지 못함 |
| 서비스 | `node src/serve.js` | 그 프로토콜을 OpenAI `/v1/chat/completions`로 변환 |

## ⚙️ CLI 옵션

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| 플래그 | 기본값 | 의미 |
| --- | --- | --- |
| `--count` | `50` | 발급할 게스트 세션 수 |
| `--model` | `n33-chat` | 실시간 검증에 사용할 모델 |
| `--conc` | `4` | 동시에 처리 중인 계정 수 (풀 크기에 의해 상한이 정해짐) |
| `--gap` | `0.5` | 각 계정 후 대기할 초 |
| `--retries` | `6` | 계정당 시도 횟수 (429는 백오프로 재시도) |
| `--proxies` | `proxies.txt` | 프록시 목록 파일 |
| `N33_PROXIES` | — | 목록 경로에 대한 환경 변수 오버라이드 |

## 🛰️ 프록시 뒤에서

모든 요청은 여러분의 풀에서 가져온 프록시 라인을 통해 나가며, **하나의 라인은 하나의 계정에 고정됩니다**: 로그인 스로틀은 주소 단위이므로, 처리 도중 출구를 바꾸는 것이 불필요한 429를 만들어냅니다. 죽은 라인은 해당 계정을 실패시키고 도구는 다음으로 넘어갑니다; `--screen`은 실행을 낭비하기 전에 어떤 라인이 `n33.ai:443`에 도달하는지 알려줍니다.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `keys.txt` | 실시간 검증된 게스트 토큰이 한 줄에 하나씩 — git에서 무시됨 |
| `accounts.json` | 계정별 출구 / 토큰 / 채팅 상태 |
| `proxies.txt` | 여러분의 출구 목록, 한 줄에 하나씩 — git에서 무시됨 |
| `outputs/` | 실행 로그 — git에서 무시됨 |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅되는 OpenAI 호환 라우터입니다. n33.ai는 OpenAI 형식이 아니므로, 9Router가 대화하는 대상은 브리지입니다 — 먼저 브리지를 시작한 뒤 키를 등록하세요:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

기본값: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. 그러면 모델은 `n33/<model id>`로 제공되며 모든 토큰에 걸쳐 로드 밸런싱됩니다; 각 연결은 `keys.txt`의 토큰을 지니고, 브리지가 해당 요청에 그 토큰을 사용합니다.

## 🔑 키 하나로 얻는 것

| | |
| --- | --- |
| 🏢 제공자 | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 제공자가 주는 것 | **게스트 세션**: 계정도, 캡차도, 메일함도 없이 — 30일 동안 유지되는 32자 토큰 |
| 🔑 토큰 하나로 얻는 것 | 자체 신원을 지닌 게스트 세션 하나이며, 함께 제공되는 브리지를 통해 제공됩니다; 소비할 쿼터는 없고, 패널의 주소당 로그인 스로틀만 있습니다 |
| 🌐 API 형태 | 함께 제공되는 브리지를 통한 OpenAI 호환: `POST http://127.0.0.1:20177/v1/chat/completions` (제품 자체는 multipart `POST /api/chat/stream`에 응답) |
| 🔒 여러분의 데이터 | `n33.ai`, 여러분이 설정한 프록시, 로컬 브리지만 관여합니다; 토큰은 여러분의 머신에 남습니다 |

## 🐞 이슈

패널이 로그인 경로, 스로틀 또는 스트림 프레이밍을 바꾸면, 도구는 해당 단계에서 멈추고 그 사실을 알려줍니다 — `node src/cli.js --verify-only`가 어느 쪽이 깨졌는지 확인하는 가장 빠른 방법입니다. 실행한 명령과 정확한 출력을 담아 **[이슈를 열어 주세요](../../issues)**; PR도 환영합니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 n33-bulk-apikey 기여자들

</div>