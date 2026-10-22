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

**n33.ai のゲストチャットセッションを一括発行 — キャプチャ不要、メールボックス不要のレールで、すべてのトークンがライブのチャット呼び出しを通過し、ローカルの OpenAI 互換ブリッジ経由で提供されます。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-3-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ なぜこれが存在するのか

N33 AI はコンシューマー向けのチャット製品です — Claude、GPT、Grok が 1 ページに揃い、年間 $250 の Pro プランがあり、**API キーのページは一切ありません**。その代わりに無料で配られるのが**ゲストセッション**です。`POST /api/auth/sign-in/anonymous` は 32 文字のトークンを返し、キャプチャもメールボックスもアカウントも不要です。このトークンは製品自身のチャットを認証し（`Authorization: Bearer <token>`）、**30 日間**有効です。本ツールはこのレールを、ライブの補完でそれぞれ検証済みのトークンを並べた `keys.txt` に変え、さらに任意のクライアントから使えるようにする OpenAI 互換ブリッジを同梱します。

## 🎁 無料枠 — どこまで使えるか

このレールには登録ボーナスもカードもメール手続きもありません — 無料枠**とは**ゲストセッションそのものです：

| 項目 | 値 |
| --- | --- |
| 必要なアカウント | **不要** — `POST /api/auth/sign-in/anonymous` |
| キャプチャ / Turnstile | サインインルートでは**なし** |
| 必要なメールボックス | **不要** |
| セッションの寿命 | **30 日**（`/api/auth/get-session` が `expiresAt` を返す） |
| 観測されたチャット上限 | セッション単位の上限には未到達：1 トークンで 8 回連続補完、すべて 200 |
| 発行上限 | **1 ウィンドウあたり出口アドレスごとに約 3 回のサインイン**、その後 `429 Too many requests` |
| スケールする単位 | **1 出口 = 1 アカウント** → `--count N` は実質「N 個のゲストセッション」 |

スロットルは**アドレス**単位なので、ここではプールは贅沢品ではありません。ツールは 1 つの出口を 1 つのアカウントに固定し、プールのサイズが実用的な同時実行数の上限になります。

> 💡 無料枠は N33 AI が設定するもので、変更される可能性があります。最新の数値は [n33.ai](https://n33.ai) で確認してください — そして最終判断はツール自身のゲートに任せましょう：

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 3 つすべて

ゲストにはカタログ全体が提供されるわけではありません。Pro 専用の id（`n33-claude-opus`、`n33-claude-fable`、`n33-gpt-terra`、`n33-gpt-sol`、`n33-gpt-astra`、`n33-gpt-5-5`、`n33-grok-4-6`、`n33-grok-4-7`、`n33-claude-sonnet`）は拒否されるのではなく `n33-chat` に**黙って置き換えられます** — `done` イベントには実際に応答したモデル名が入ります。3 つの id は自分自身として応答します：

| モデル id | 提供されるモデル | 備考 |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | 無料のデフォルトで、常に利用可能 |
| `n33-grok` | Grok | xAI ファミリーの無料枠 |
| `n33-gpt` | GPT | OpenAI ファミリーの無料枠 |

カタログ内のそれ以外の id はエンドポイントに受け入れられますが、応答は `n33-chat` から返ります。

## 🧪 API の使い方

N33 AI は独自プロトコルで話します — `data: {...}` のイベント行で応答するマルチパートの `POST /api/chat/stream` です — そのため OpenAI を前提としたものは直接会話できません。**`src/serve.js` がそのエンドポイントです**：任意の OpenAI クライアントをこれに向ければ、`keys.txt` のトークンが通常の API キーのように振る舞います。

```bash

# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

ブリッジは `n33-chat`、`n33-grok`、`n33-gpt` を提供し、ストリーミング（`"stream": true`）に対応し、`keys.txt` を自動でローテーションし、空でない任意のキーを受け付けます — `keys.txt` にあるキーはそのリクエストで使われ、それ以外はラウンドロビンで割り当てられます。

製品と直接やり取りすることも可能です。トークンは単なるベアラ資格情報です：

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 クイックスタート

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

`keys.txt` は、ライブのチャット補完がトークンを証明した**後だけ**書き込まれます。

### 🖱️ ランチャー

ランチャーはプロキシリスト、件数、検証用モデルを尋ね、それらを `launcher.config.json` に記憶し、適切なフラグで CLI を実行します。`Connect to 9Router` の項目はブリッジ経由でキーを登録します。

## ✅ 動作検証済み — すべてのキーをテスト

以下の主張はすべて **2026-10-19** にライブサイトに対して計測したものです。

| チェック | 結果 |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — 32 文字のトークン、キャプチャなし、メールボックス不要 |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` は **30 日**後 |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me`（ヘッダーなし） | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — `data:` チャンク、続いて `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream`（認証なし） | **401** `{"error":"Unauthorized"}` |
| 1 トークンで 8 回連続補完 | **8 × 200** — セッション単位の上限には未到達 |
| Pro 専用モデル id | **200**、`n33-chat` が応答（黙示的な置換） |
| 1 アドレスからのサインイン連打 | ウィンドウ内で約 3 回の後に **429** — ツールは間隔を空けて再試行 |
| チャットチェックに失敗したトークン | `keys.txt` には決して書き込まれない。アカウントは `accounts.json` に記録される |
| ローカルブリッジ `POST /v1/chat/completions` | **200** — バッファリングと `stream: true` の両方を検証 |

いつでも再チェックできます：

```bash
node src/cli.js --verify-only
```

## 🧭 仕組み

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| サインイン | `POST /api/auth/sign-in/anonymous` | better-auth のゲストルート。`{token, user}` を返す |
| 認証 | `Authorization: Bearer <token>` | Cookie ジャーは*不要* — ベアラ形式が受け入れられる |
| 読み戻し | `GET /api/auth/get-session` | セッションレコード、`expiresAt` = +30 日 |
| チャット | `POST /api/chat/stream` | マルチパート：`message`、`model`、`history`、`webSearch`、`textChatMode`、`guestKey` |
| 応答 | `data: {"chunk":…}` … `{"done":true,"model":…}` | `model` フィールドには実際に応答した id が入る |
| チェック | 200 **かつ**テキスト**かつ** `done` | それ未満のものは `keys.txt` に到達しない |
| 提供 | `node src/serve.js` | そのプロトコルを OpenAI `/v1/chat/completions` に変換する |

## ⚙️ CLI オプション

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| フラグ | デフォルト | 意味 |
| --- | --- | --- |
| `--count` | `50` | 発行するゲストセッション数 |
| `--model` | `n33-chat` | ライブ検証に使うモデル |
| `--conc` | `4` | 同時に処理するアカウント数（プールサイズが上限） |
| `--gap` | `0.5` | 各アカウントの後に待つ秒数 |
| `--retries` | `6` | アカウントごとの試行回数（429 はバックオフ付きで再試行） |
| `--proxies` | `proxies.txt` | プロキシリストファイル |
| `N33_PROXIES` | — | リストパスの環境変数による上書き |

## 🛰️ プロキシの背後で

すべてのリクエストはプール内のプロキシ行を通って出ていき、**1 行が 1 アカウントに固定されます**。サインインのスロットルはアドレス単位なので、途中で出口を切り替えることが無駄な 429 を生む原因になります。死んだ行はそのアカウントを失敗させ、ツールは次へ進みます。`--screen` を使えば、実行を消費する前にどの行が `n33.ai:443` に到達できるかを確認できます。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | ライブ検証済みのゲストトークンを 1 行に 1 つ — git 管理外 |
| `accounts.json` | アカウントごとの出口 / トークン / チャット状態 |
| `proxies.txt` | 出口を 1 行に 1 つ — git 管理外 |
| `outputs/` | 実行ログ — git 管理外 |

## 🔌 9Router への接続

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです。n33.ai は OpenAI の形をしていないため、9Router が話す相手はブリッジになります — 先にブリッジを起動し、その後でキーを登録してください：

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

デフォルト：`--base http://localhost:20128`、`--password 123456`、`--name "N33 AI"`、`--prefix n33`、`--base-url http://127.0.0.1:20177/v1`。モデルは `n33/<model id>` として提供され、すべてのトークンに負荷分散されます。各接続は `keys.txt` のトークンを保持し、ブリッジはそのリクエストでそれを使います。

## 🔌 OmniRoute への接続

[OmniRoute](https://omniroute.online) はセルフホスト型の OpenAI 互換ルーターです。n33.ai は OpenAI の形をしていないため、OmniRoute が話す相手はブリッジになります — 先にブリッジを起動し、その後でキーを登録してください：

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-omniroute.js    # registers the provider node + one connection per key
```

デフォルト：`--base http://localhost:20128`、`--password 123456`、`--name "N33 AI"`、`--prefix n33`、`--base-url http://127.0.0.1:20177/v1`。モデルは `n33/<model id>` として提供され、すべてのトークンに負荷分散されます。各接続は `keys.txt` のトークンを保持し、ブリッジはそのリクエストでそれを使います。
## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダー | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 プロバイダーが提供するもの | **ゲストセッション**：アカウント不要、キャプチャ不要、メールボックス不要 — 30 日間有効な 32 文字のトークン |
| 🔑 1 つのトークンで得られるもの | 独自の identity を持つ 1 つのゲストセッションで、同梱のブリッジ経由で提供される。消費するクォータはなく、あるのはパネルのアドレス単位のサインインスロットルだけ |
| 🌐 API の形 | 同梱ブリッジ経由で OpenAI 互換：`POST http://127.0.0.1:20177/v1/chat/completions`（製品自体はマルチパートの `POST /api/chat/stream` に応答する） |
| 🔒 あなたのデータ | 関与するのは `n33.ai`、設定したプロキシ、ローカルブリッジのみ。トークンはあなたのマシンに留まる |

## 🐞 問題報告

パネルがサインインルート、スロットル、ストリームのフレーミングを変更した場合、ツールはそのステップで停止し、そう告げます — `node src/cli.js --verify-only` がどちら側が壊れたかを確認する最速の方法です。実行したコマンドと正確な出力を添えて **[issue を作成してください](../../issues)**。PR も歓迎です。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照してください。

<div align="center">

**[MIT](LICENSE)** © 2026 n33-bulk-apikey コントリビューター

</div>