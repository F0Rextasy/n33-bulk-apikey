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

**Массовое создание гостевых чат-сессий n33.ai — канал без капчи и без почтового ящика, где каждый токен прошёл проверку живым чат-запросом и доступен через локальный OpenAI-совместимый мост.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный уровень](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-3-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Параметры](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Зачем это нужно

N33 AI — это потребительский чат-продукт: Claude, GPT и Grok на одной странице, тариф Pro за $250 в год и **вообще никакой страницы с API-ключами**. А что он бесплатно выдаёт, так это **гостевую сессию**: `POST /api/auth/sign-in/anonymous` отвечает 32-символьным токеном без капчи, без почтового ящика и без аккаунта. Этот токен аутентифицирует собственный чат продукта (`Authorization: Bearer <token>`) и живёт **30 дней**. Этот инструмент превращает этот канал в `keys.txt` из токенов, каждый из которых был подтверждён живым completion-запросом, — и поставляет OpenAI-совместимый мост, позволяющий использовать их из любого клиента.

## 🎁 Бесплатный уровень — сколько вы получаете

Здесь нет стартового кредита, карты и шага с e-mail — бесплатный уровень **и есть** гостевая сессия:

| Что | Значение |
| --- | --- |
| Нужен аккаунт | **Нет** — `POST /api/auth/sign-in/anonymous` |
| Капча / Turnstile | **нет** на маршруте входа |
| Нужен почтовый ящик | **Нет** |
| Срок жизни сессии | **30 дней** (`/api/auth/get-session` возвращает `expiresAt`) |
| Наблюдаемый лимит чата | не достигнут лимит на сессию: 8 последовательных completion-запросов на одном токене, все 200 |
| Лимит создания | **~3 входа за окно на адрес выхода**, затем `429 Too many requests` |
| Единица масштабирования | **один выход = один аккаунт** → `--count N` — это на самом деле «N гостевых сессий» |

Поскольку троттлинг действует на **адрес**, пул здесь не роскошь: инструмент закрепляет один выход за одним аккаунтом, а размер пула ограничивает полезную конкурентность.

> 💡 Бесплатный уровень задаётся N33 AI и может меняться. Актуальные цифры смотрите на [n33.ai](https://n33.ai) — и пусть решает собственная проверка инструмента:

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 3

Гостям предлагают не весь каталог: идентификаторы только для Pro (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) **молча заменяются** на `n33-chat`, а не отклоняются — событие `done` называет модель, которая реально ответила. Три идентификатора отвечают сами за себя:

| Идентификатор модели | Обслуживается как | Примечания |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | бесплатный по умолчанию, доступен всегда |
| `n33-grok` | Grok | бесплатная ступень семейства xAI |
| `n33-gpt` | GPT | бесплатная ступень семейства OpenAI |

Любой другой идентификатор из каталога принимается эндпоинтом, но отвечает `n33-chat`.

## 🧪 Как использовать API

N33 AI говорит на собственном протоколе — multipart `POST /api/chat/stream`, который отвечает строками событий `data: {...}`, — поэтому ничто, ожидающее OpenAI, не может общаться с ним напрямую. **`src/serve.js` — это тот самый эндпоинт**: направьте на него любого OpenAI-клиента, и токены из `keys.txt` будут вести себя как обычные API-ключи.

```bash

# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

Мост обслуживает `n33-chat`, `n33-grok` и `n33-gpt`, поддерживает потоковую передачу (`"stream": true`), автоматически чередует ключи из `keys.txt` и принимает любой непустой ключ — ключ, который есть в `keys.txt`, используется для этого запроса, всё остальное идёт по кругу.

Можно также обращаться к продукту напрямую; токен — это обычный bearer-креденшл:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Быстрый старт

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

`keys.txt` записывается **только** после того, как живой чат-completion подтвердит токен.

### 🖱️ Лаунчер

Лаунчер запрашивает список прокси, количество и модель для проверки, запоминает их в `launcher.config.json` и запускает CLI с нужными флагами. Его пункт `Connect to 9Router` регистрирует ключи через мост.

## ✅ Проверено в работе — каждый ключ протестирован

Каждое утверждение ниже было измерено на живом сайте **2026-10-19**.

| Проверка | Результат |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — 32-символьный токен, без капчи, без почты |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` через **30 дней** |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (no header) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — фрагменты `data:`, затем `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (no auth) | **401** `{"error":"Unauthorized"}` |
| 8 последовательных запросов completion, один токен | **8 × 200** — лимит на сессию не достигнут |
| Идентификаторы моделей только для Pro | **200**, отвечает `n33-chat` (молчаливая замена) |
| всплеск входов с одного адреса | **429** после ~3 за окно — инструмент выдерживает темп и повторяет попытки |
| токен, не прошедший проверку чатом | никогда не записывается в `keys.txt`; аккаунт фиксируется в `accounts.json` |
| локальный мост `POST /v1/chat/completions` | **200** — проверены и буферизованный режим, и `stream: true` |

Перепроверить в любой момент:

```bash
node src/cli.js --verify-only
```

## 🧭 Как это работает

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Шаг | Вызов | Примечания |
| --- | --- | --- |
| вход | `POST /api/auth/sign-in/anonymous` | гостевой маршрут better-auth; возвращает `{token, user}` |
| авторизация | `Authorization: Bearer <token>` | хранилище cookie *не* требуется — bearer-форма принимается |
| обратное чтение | `GET /api/auth/get-session` | запись сессии, `expiresAt` = +30 дней |
| чат | `POST /api/chat/stream` | multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| ответ | `data: {"chunk":…}` … `{"done":true,"model":…}` | поле `model` сообщает идентификатор, который реально обслужил запрос |
| проверка | 200 **и** текст **и** `done` | всё меньшее никогда не попадает в `keys.txt` |
| обслуживание | `node src/serve.js` | переводит этот протокол в OpenAI `/v1/chat/completions` |

## ⚙️ Параметры CLI

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Флаг | По умолчанию | Значение |
| --- | --- | --- |
| `--count` | `50` | сколько гостевых сессий создать |
| `--model` | `n33-chat` | модель, используемая для живой проверки |
| `--conc` | `4` | аккаунтов в работе (ограничено размером пула) |
| `--gap` | `0.5` | секунд ожидания после каждого аккаунта |
| `--retries` | `6` | попыток на аккаунт (429 повторяется с backoff) |
| `--proxies` | `proxies.txt` | файл со списком прокси |
| `N33_PROXIES` | — | переопределение пути к списку через переменную окружения |

## 🛰️ За прокси

Каждый запрос выходит через строку прокси из вашего пула, и **одна строка закреплена за одним аккаунтом**: троттлинг входа действует на адрес, поэтому перескакивание между выходами на ходу порождает лишние 429. Мёртвая строка проваливает этот аккаунт, и инструмент двигается дальше; `--screen` показывает, какие строки достигают `n33.ai:443`, прежде чем вы потратите на них запуск.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `keys.txt` | один проверенный вживую гостевой токен на строку — игнорируется git |
| `accounts.json` | выход / токен / статус чата для каждого аккаунта |
| `proxies.txt` | ваши выходы, по одному на строку — игнорируется git |
| `outputs/` | журнал запуска — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый OpenAI-совместимый роутер. Поскольку n33.ai не имеет OpenAI-формы, 9Router общается с мостом — сначала запустите его, затем зарегистрируйте ключи:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

По умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Модели затем обслуживаются как `n33/<model id>` и балансируются между всеми токенами; каждое подключение несёт токен из `keys.txt`, который мост использует для этого запроса.

## 🔌 Подключение к OmniRoute

[OmniRoute](https://omniroute.online) — это самостоятельно размещаемый OpenAI-совместимый роутер. Поскольку n33.ai не имеет OpenAI-формы, OmniRoute общается с мостом — сначала запустите его, затем зарегистрируйте ключи:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-omniroute.js    # registers the provider node + one connection per key
```

По умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Модели затем обслуживаются как `n33/<model id>` и балансируются между всеми токенами; каждое подключение несёт токен из `keys.txt`, который мост использует для этого запроса.
## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 Что даёт провайдер | **гостевую сессию**: без аккаунта, без капчи, без почты — 32-символьный токен, живущий 30 дней |
| 🔑 Что даёт один токен | одну гостевую сессию с собственной идентичностью, обслуживаемую через встроенный мост; здесь нет квоты, которую можно потратить, — только троттлинг входов на адрес на стороне панели |
| 🌐 Форма API | OpenAI-совместимая **через встроенный мост**: `POST http://127.0.0.1:20177/v1/chat/completions` (сам продукт отвечает на multipart `POST /api/chat/stream`) |
| 🔒 Ваши данные | задействованы только `n33.ai`, настроенные вами прокси и локальный мост; токены остаются на вашей машине |

## 🐞 Проблемы

Если панель изменит маршрут входа, троттлинг или формат потоковой передачи, инструмент остановится на этом шаге и сообщит об этом — `node src/cli.js --verify-only` — самый быстрый способ увидеть, какая половина сломалась. **[Открыть issue](../../issues)** с командой, которую вы запускали, и точным выводом; PR приветствуются.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 участники n33-bulk-apikey

</div>