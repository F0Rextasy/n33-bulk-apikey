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

**n33.ai-Gast-Chat-Sitzungen im Massenverfahren erzeugen — eine captcha-freie, postfachfreie Schiene, auf der jeder Token einen Live-Chat-Aufruf überstanden hat, bereitgestellt über eine lokale OpenAI-kompatible Brücke.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Kostenloser Tarif](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-3-of-them) · [🧪 Die API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

N33 AI ist ein Verbraucher-Chatprodukt — Claude, GPT und Grok hinter einer Seite, ein Pro-Tarif für 250 $/Jahr und **überhaupt keine API-Schlüssel-Seite**. Was es jedoch kostenlos herausgibt, ist eine **Gast-Sitzung**: `POST /api/auth/sign-in/anonymous` antwortet mit einem 32-Zeichen-Token und ohne Captcha, ohne Postfach und ohne Konto. Dieser Token authentifiziert den eigenen Chat des Produkts (`Authorization: Bearer <token>`) und lebt **30 Tage**. Dieses Tool verwandelt diese Schiene in eine `keys.txt` mit Token, von denen jeder mit einer Live-Completion bewiesen wurde — und liefert die OpenAI-kompatible Brücke mit, die sie von jedem Client aus nutzbar macht.

## 🎁 Kostenloser Tarif — wie viel du bekommst

Es gibt kein Anmeldeguthaben, keine Karte und keinen E-Mail-Schritt auf dieser Schiene — der kostenlose Tarif **ist** die Gast-Sitzung:

| Was | Wert |
| --- | --- |
| Konto erforderlich | **Nein** — `POST /api/auth/sign-in/anonymous` |
| Captcha / Turnstile | **keines** auf der Anmelderoute |
| Postfach erforderlich | **Nein** |
| Sitzungslebensdauer | **30 Tage** (`/api/auth/get-session` meldet `expiresAt`) |
| Beobachtetes Chat-Limit | kein Sitzungslimit erreicht: 8 aufeinanderfolgende Completions mit einem Token, alle 200 |
| Erstellungslimit | **~3 Anmeldungen pro Zeitfenster pro Exit-Adresse**, dann `429 Too many requests` |
| Die skalierende Einheit | **ein Exit = ein Konto** → `--count N` bedeutet eigentlich „N Gast-Sitzungen“ |

Da die Drosselung pro **Adresse** gilt, ist der Pool hier kein Luxus: Das Tool bindet einen Exit an ein Konto, und die Poolgröße begrenzt die sinnvolle Parallelität.

> 💡 Der kostenlose Tarif wird von N33 AI festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [n33.ai](https://n33.ai) — und lass die eigene Prüfung des Tools entscheiden:

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 3

Gästen wird nicht der gesamte Katalog angeboten: Die Nur-Pro-IDs (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) werden **still durch** `n33-chat` **ersetzt**, statt abgelehnt zu werden — das `done`-Ereignis nennt das Modell, das tatsächlich geantwortet hat. Drei IDs antworten als sie selbst:

| Modell-ID | Bereitgestellt als | Hinweise |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | der kostenlose Standard, immer verfügbar |
| `n33-grok` | Grok | kostenlose Stufe der xAI-Familie |
| `n33-gpt` | GPT | kostenlose Stufe der OpenAI-Familie |

Alles andere im Katalog wird vom Endpunkt akzeptiert, aber von `n33-chat` beantwortet.

## 🧪 Die API verwenden

N33 AI spricht sein eigenes Protokoll — ein Multipart-`POST /api/chat/stream`, das in `data: {...}`-Ereigniszeilen antwortet — daher kann nichts, was OpenAI erwartet, direkt damit sprechen. **`src/serve.js` ist dieser Endpunkt**: Richte einen beliebigen OpenAI-Client darauf, und die Token in `keys.txt` verhalten sich wie gewöhnliche API-Schlüssel.

```bash

# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

Die Brücke stellt `n33-chat`, `n33-grok` und `n33-gpt` bereit, unterstützt Streaming (`"stream": true`), rotiert automatisch über `keys.txt` und akzeptiert jeden nicht leeren Schlüssel — ein Schlüssel, der in `keys.txt` steht, wird für diese Anfrage verwendet, alles andere wird reihum verwendet.

Der direkte Kontakt mit dem Produkt ist ebenfalls möglich; der Token ist eine einfache Bearer-Anmeldeinformation:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Schnellstart

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

`keys.txt` wird **erst** geschrieben, nachdem eine Live-Chat-Completion den Token bestätigt hat.

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste, der Anzahl und dem Verifizierungsmodell, speichert sie in `launcher.config.json` und führt die CLI mit den richtigen Flags aus. Sein Eintrag `Connect to 9Router` registriert die Schlüssel über die Brücke.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

Jede Aussage unten wurde am **2026-10-19** gegen die Live-Website gemessen.

| Prüfung | Ergebnis |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — 32-Zeichen-Token, kein Captcha, kein Postfach |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` **30 Tage** in der Zukunft |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (ohne Header) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — `data:`-Chunks, dann `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (ohne Authentifizierung) | **401** `{"error":"Unauthorized"}` |
| 8 aufeinanderfolgende Completions, ein Token | **8 × 200** — kein Sitzungslimit erreicht |
| Nur-Pro-Modell-IDs | **200**, beantwortet von `n33-chat` (stille Ersetzung) |
| Anmelde-Burst von einer Adresse | **429** nach ~3 in einem Zeitfenster — das Tool dosiert und versucht erneut |
| ein Token, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben; das Konto wird in `accounts.json` erfasst |
| lokale Brücke `POST /v1/chat/completions` | **200** — gepuffert und `stream: true` beide verifiziert |

Jederzeit erneut prüfen:

```bash
node src/cli.js --verify-only
```

## 🧭 So funktioniert es

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Schritt | Aufruf | Hinweise |
| --- | --- | --- |
| Anmeldung | `POST /api/auth/sign-in/anonymous` | better-auth-Gastroute; gibt `{token, user}` zurück |
| Authentifizierung | `Authorization: Bearer <token>` | der Cookie-Speicher ist *nicht* erforderlich — die Bearer-Form wird akzeptiert |
| Rücklesen | `GET /api/auth/get-session` | Sitzungseintrag, `expiresAt` = +30 Tage |
| Chat | `POST /api/chat/stream` | Multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| Antwort | `data: {"chunk":…}` … `{"done":true,"model":…}` | das Feld `model` meldet die ID, die tatsächlich bedient hat |
| Prüfung | 200 **und** Text **und** `done` | alles Geringere erreicht nie `keys.txt` |
| Bereitstellen | `node src/serve.js` | übersetzt dieses Protokoll in OpenAI `/v1/chat/completions` |

## ⚙️ CLI-Optionen

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Flag | Standard | Bedeutung |
| --- | --- | --- |
| `--count` | `50` | wie viele Gast-Sitzungen erzeugt werden |
| `--model` | `n33-chat` | Modell, das für die Live-Verifizierung verwendet wird |
| `--conc` | `4` | gleichzeitig laufende Konten (begrenzt durch die Poolgröße) |
| `--gap` | `0.5` | Sekunden Wartezeit nach jedem Konto |
| `--retries` | `6` | Versuche pro Konto (429 wird mit Backoff erneut versucht) |
| `--proxies` | `proxies.txt` | Datei mit der Proxy-Liste |
| `N33_PROXIES` | — | Umgebungsüberschreibung für den Listenpfad |

## 🛰️ Hinter einem Proxy

Jede Anfrage geht über eine Proxy-Zeile aus deinem Pool hinaus, und **eine Zeile ist an ein Konto gebunden**: Die Anmeldedrosselung gilt pro Adresse, daher erzeugt das Wechseln der Exits während des Laufs unnötige 429-Antworten. Eine tote Zeile lässt dieses Konto fehlschlagen, und das Tool macht weiter; `--screen` zeigt dir, welche Zeilen `n33.ai:443` erreichen, bevor du einen Lauf dafür verbrauchst.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | ein live-verifizierter Gast-Token pro Zeile — von Git ignoriert |
| `accounts.json` | Exit-/Token-/Chat-Status pro Konto |
| `proxies.txt` | deine Exits, einer pro Zeile — von Git ignoriert |
| `outputs/` | Laufprotokoll — von Git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Da n33.ai nicht OpenAI-förmig ist, spricht 9Router mit der Brücke — starte sie zuerst und registriere dann die Schlüssel:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Die Modelle werden dann als `n33/<model id>` bereitgestellt und über jeden Token lastverteilt; jede Verbindung trägt einen Token aus `keys.txt`, den die Brücke für diese Anfrage verwendet.

## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 Was der Anbieter bereitstellt | eine **Gast-Sitzung**: kein Konto, kein Captcha, kein Postfach — ein 32-Zeichen-Token, der 30 Tage lebt |
| 🔑 Was ein Token dir bringt | eine Gast-Sitzung mit eigener Identität, bereitgestellt über die mitgelieferte Brücke; es gibt kein Kontingent zu verbrauchen, nur die Anmeldedrosselung des Panels pro Adresse |
| 🌐 API-Form | OpenAI-kompatibel **über die mitgelieferte Brücke**: `POST http://127.0.0.1:20177/v1/chat/completions` (das Produkt selbst beantwortet ein Multipart-`POST /api/chat/stream`) |
| 🔒 Deine Daten | nur `n33.ai`, die von dir konfigurierten Proxys und die lokale Brücke sind beteiligt; Token bleiben auf deinem Rechner |

## 🐞 Probleme

Wenn das Panel seine Anmelderoute, seine Drosselung oder sein Stream-Framing ändert, stoppt das Tool an diesem Schritt und sagt es — `node src/cli.js --verify-only` ist der schnellste Weg zu sehen, welche Hälfte kaputt ist. **[Öffne ein Issue](../../issues)** mit dem Befehl, den du ausgeführt hast, und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 n33-bulk-apikey-Mitwirkende

</div>