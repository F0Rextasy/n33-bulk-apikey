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

**Acuña en masa sesiones de chat de invitado de n33.ai — una vía sin captcha y sin buzón de correo en la que cada token superó una llamada de chat real, servida mediante un puente local compatible con OpenAI.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-3-of-them) · [🧪 Usar la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por qué existe esto

N33 AI es un producto de chat de consumo — Claude, GPT y Grok tras una sola página, un plan Pro de 250 $/año y **ninguna página de claves de API**. Lo que sí entrega gratis es una **sesión de invitado**: `POST /api/auth/sign-in/anonymous` responde con un token de 32 caracteres, sin captcha, sin buzón y sin cuenta. Ese token autentica el propio chat del producto (`Authorization: Bearer <token>`) y dura **30 días**. Esta herramienta convierte esa vía en un `keys.txt` de tokens, cada uno demostrado con una completion real, y además incluye el puente compatible con OpenAI que los hace utilizables desde cualquier cliente.

## 🎁 Nivel gratuito — cuánto obtienes

En esta vía no hay crédito de registro, ni tarjeta, ni paso de correo electrónico: el nivel gratuito **es** la sesión de invitado:

| Qué | Valor |
| --- | --- |
| Cuenta necesaria | **No** — `POST /api/auth/sign-in/anonymous` |
| Captcha / Turnstile | **ninguno** en la ruta de inicio de sesión |
| Buzón necesario | **No** |
| Duración de la sesión | **30 días** (`/api/auth/get-session` informa de `expiresAt`) |
| Límite de chat observado | no se alcanzó ningún tope por sesión: 8 completions secuenciales con un token, todas 200 |
| Límite de acuñación | **~3 inicios de sesión por ventana por dirección de salida**, luego `429 Too many requests` |
| La unidad que escala | **una salida = una cuenta** → `--count N` en realidad significa "N sesiones de invitado" |

Como el límite es por **dirección**, el pool no es un lujo aquí: la herramienta fija una salida a una cuenta, y el tamaño del pool limita la concurrencia útil.

> 💡 El nivel gratuito lo define N33 AI y puede cambiar. Consulta las cifras en vivo en [n33.ai](https://n33.ai) — y deja que la propia verificación de la herramienta decida:

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 3

A los invitados no se les ofrece el catálogo completo: los ids exclusivos de Pro (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) se **sustituyen silenciosamente** por `n33-chat` en lugar de rechazarse — el evento `done` indica el modelo que realmente respondió. Tres ids responden como ellos mismos:

| Id del modelo | Se sirve como | Notas |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | el predeterminado gratuito, siempre disponible |
| `n33-grok` | Grok | el escalón gratuito de la familia xAI |
| `n33-gpt` | GPT | el escalón gratuito de la familia OpenAI |

Cualquier otro modelo del catálogo es aceptado por el endpoint, pero lo responde `n33-chat`.

## 🧪 Cómo usar la API

N33 AI habla su propio protocolo — un `POST /api/chat/stream` multipart que responde con líneas de evento `data: {...}` — así que nada que espere OpenAI puede hablar con él directamente. **`src/serve.js` es ese endpoint**: apunta cualquier cliente OpenAI hacia él y los tokens de `keys.txt` se comportan como claves de API normales.

```bash
# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

El puente sirve `n33-chat`, `n33-grok` y `n33-gpt`, admite streaming (`"stream": true`), rota automáticamente entre los tokens de `keys.txt` y acepta cualquier clave no vacía — una clave que esté en `keys.txt` se usa para esa petición; cualquier otra entra en el round-robin.

También es posible hablar directamente con el producto; el token es una credencial bearer normal:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Inicio rápido

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

`keys.txt` se escribe **solo** después de que una completion de chat real demuestre que el token está vivo.

### 🖱️ El lanzador

El lanzador pregunta por la lista de proxies, la cantidad y el modelo de verificación, los recuerda en `launcher.config.json` y ejecuta la CLI con los flags adecuados. Su opción `Connect to 9Router` registra las claves a través del puente.

## ✅ Verificado y funcionando — cada clave se prueba

Cada afirmación a continuación se midió contra el sitio en vivo el **2026-10-19**.

| Comprobación | Resultado |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — token de 32 caracteres, sin captcha, sin buzón |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` a **30 días** |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (sin cabecera) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — fragmentos `data:`, luego `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (sin autenticación) | **401** `{"error":"Unauthorized"}` |
| 8 completions secuenciales, un token | **8 × 200** — no se alcanzó ningún tope por sesión |
| Ids de modelo exclusivos de Pro | **200**, respondidos por `n33-chat` (sustitución silenciosa) |
| ráfaga de inicios de sesión desde una dirección | **429** tras ~3 en una ventana — la herramienta marca el ritmo y reintenta |
| un token que falla su comprobación de chat | nunca se escribe en `keys.txt`; la cuenta queda registrada en `accounts.json` |
| puente local `POST /v1/chat/completions` | **200** — verificado tanto en modo buffer como con `stream: true` |

Vuelve a comprobarlo en cualquier momento:

```bash
node src/cli.js --verify-only
```

## 🧭 Cómo funciona

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Paso | Llamada | Notas |
| --- | --- | --- |
| inicio de sesión | `POST /api/auth/sign-in/anonymous` | ruta de invitado de better-auth; devuelve `{token, user}` |
| autenticación | `Authorization: Bearer <token>` | el cookie jar *no* es necesario — se acepta la forma bearer |
| lectura de vuelta | `GET /api/auth/get-session` | registro de sesión, `expiresAt` = +30 días |
| chat | `POST /api/chat/stream` | multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| respuesta | `data: {"chunk":…}` … `{"done":true,"model":…}` | el campo `model` indica el id que realmente lo sirvió |
| comprobación | 200 **y** texto **y** `done` | cualquier cosa menor nunca llega a `keys.txt` |
| servir | `node src/serve.js` | traduce ese protocolo a `/v1/chat/completions` de OpenAI |

## ⚙️ Opciones de la CLI

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Flag | Predeterminado | Significado |
| --- | --- | --- |
| `--count` | `50` | cuántas sesiones de invitado acuñar |
| `--model` | `n33-chat` | modelo usado para la verificación en vivo |
| `--conc` | `4` | cuentas en curso (limitado por el tamaño del pool) |
| `--gap` | `0.5` | segundos de espera tras cada cuenta |
| `--retries` | `6` | intentos por cuenta (el 429 se reintenta con backoff) |
| `--proxies` | `proxies.txt` | archivo de lista de proxies |
| `N33_PROXIES` | — | sustitución por variable de entorno para la ruta de la lista |

## 🛰️ Detrás de un proxy

Cada petición sale por una línea de proxy de tu pool, y **una línea queda fijada a una cuenta**: el límite de inicio de sesión es por dirección, así que saltar de salida a mitad de vuelo es lo que produce 429 innecesarios. Una línea muerta hace fallar esa cuenta y la herramienta continúa; `--screen` te dice qué líneas llegan a `n33.ai:443` antes de gastar una ejecución en ellas.

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `keys.txt` | un token de invitado verificado en vivo por línea — ignorado por git |
| `accounts.json` | estado de salida / token / chat por cuenta |
| `proxies.txt` | tus salidas, una por línea — ignorado por git |
| `outputs/` | registro de ejecución — ignorado por git |

## 🔌 Conectar con 9Router

[9Router](https://9router.com) es un router autoalojado y compatible con OpenAI. Como n33.ai no tiene la forma de OpenAI, el puente es con quien habla 9Router — inícialo primero y luego registra las claves:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

Valores predeterminados: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Los modelos se sirven entonces como `n33/<model id>` y se balancean entre todos los tokens; cada conexión lleva un token de `keys.txt`, que el puente usa para esa petición.

## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 Qué entrega el proveedor | una **sesión de invitado**: sin cuenta, sin captcha, sin buzón — un token de 32 caracteres que dura 30 días |
| 🔑 Qué te da un token | una sesión de invitado con identidad propia, servida a través del puente incluido; no hay cuota que gastar, solo el límite de inicio de sesión por dirección del panel |
| 🌐 Forma de la API | compatible con OpenAI **a través del puente incluido**: `POST http://127.0.0.1:20177/v1/chat/completions` (el producto en sí responde a un `POST /api/chat/stream` multipart) |
| 🔒 Tus datos | solo intervienen `n33.ai`, los proxies que configures y el puente local; los tokens se quedan en tu máquina |

## 🐞 Problemas

Si el panel cambia su ruta de inicio de sesión, su límite o el framing del stream, la herramienta se detiene en ese paso y lo indica — `node src/cli.js --verify-only` es la forma más rápida de ver qué mitad se rompió. **[Abre un issue](../../issues)** con el comando que ejecutaste y la salida exacta; las PR son bienvenidas.

## 📄 Licencia

MIT © 2026 — consulta [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 colaboradores de n33-bulk-apikey

</div>