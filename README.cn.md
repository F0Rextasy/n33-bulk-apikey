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

**批量铸造 n33.ai 访客聊天会话——一条无需验证码、无需邮箱的通道，每个令牌都经过了实时聊天调用的验证，并通过本地 OpenAI 兼容桥接服务提供。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![依赖](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![许可证](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![模型](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-3-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么有这个项目

N33 AI 是一个面向消费者的聊天产品——Claude、GPT 和 Grok 都放在一个页面里，Pro 计划每年 $250，而且**完全没有 API 密钥页面**。它免费发放的是一个**访客会话**：`POST /api/auth/sign-in/anonymous` 会返回一个 32 字符的令牌，无需验证码、无需邮箱，也无需账户。该令牌可用于认证产品自身的聊天（`Authorization: Bearer <token>`），有效期为 **30 天**。本工具将这条通道转化为一个 `keys.txt` 文件，其中的每个令牌都经过了实时补全的验证——并附带 OpenAI 兼容桥接服务，使其可在任何客户端中使用。

## 🎁 免费额度——你能获得多少

这条通道没有注册赠金、无需银行卡、也没有电子邮件步骤——免费层级**就是**访客会话：

| 项目 | 值 |
| --- | --- |
| 是否需要账户 | **否**——`POST /api/auth/sign-in/anonymous` |
| 验证码 / Turnstile | 登录路由上**没有** |
| 是否需要邮箱 | **否** |
| 会话有效期 | **30 天**（`/api/auth/get-session` 会报告 `expiresAt`） |
| 观察到的聊天限制 | 未触及每会话上限：同一令牌连续 8 次补全，全部返回 200 |
| 铸造限制 | **每个出口地址每个窗口约 3 次登录**，随后返回 `429 Too many requests` |
| 可扩展单位 | **一个出口 = 一个账户** → `--count N` 实际上表示“N 个访客会话” |

由于限流是按**地址**实施的，代理池在这里并非可有可无：工具会将一个出口固定绑定到一个账户，而代理池大小会限制可用的并发数。

> 💡 免费额度由 N33 AI 设定，并且可能变化。请在 [n33.ai](https://n33.ai) 查看实时数值——并让工具自身的校验来决定：

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 模型——全部 3 个

访客无法使用整个目录：仅限 Pro 的 ID（`n33-claude-opus`、`n33-claude-fable`、`n33-gpt-terra`、`n33-gpt-sol`、`n33-gpt-astra`、`n33-gpt-5-5`、`n33-grok-4-6`、`n33-grok-4-7`、`n33-claude-sonnet`）不会被拒绝，而是会被**静默替换**为 `n33-chat`——`done` 事件会指出真正作答的模型。有三个 ID 会以自身身份作答：

| 模型 ID | 实际提供为 | 备注 |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | 免费默认模型，始终可用 |
| `n33-grok` | Grok | xAI 系列的免费档位 |
| `n33-gpt` | GPT | OpenAI 系列的免费档位 |

目录中的其他任何模型都会被该端点接受，但由 `n33-chat` 作答。

## 🧪 如何使用 API

N33 AI 使用自己的协议——一个以 `data: {...}` 事件行作答的 multipart `POST /api/chat/stream`——因此任何期待 OpenAI 协议的客户端都无法直接与它通信。**`src/serve.js` 就是那个端点**：将任何 OpenAI 客户端指向它，`keys.txt` 中的令牌就会像普通 API 密钥一样工作。

```bash

# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

该桥接服务提供 `n33-chat`、`n33-grok` 和 `n33-gpt`，支持流式传输（`"stream": true`），会自动在 `keys.txt` 之间轮换，并接受任何非空密钥——如果密钥存在于 `keys.txt` 中，就会用于该请求；否则会轮询使用。

也可以直接与产品通信；该令牌就是一个普通的 bearer 凭据：

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 快速开始

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

只有在一次实时聊天补全证明该令牌有效后，才会写入 `keys.txt`。

### 🖱️ 启动器

启动器会询问代理列表、数量以及验证模型，将它们记录在 `launcher.config.json` 中，并使用正确的标志运行 CLI。其 `Connect to 9Router` 项会通过桥接服务注册密钥。

## ✅ 已验证可用——每个密钥都经过测试

以下每一项结论都于 **2026-10-19** 针对线上站点进行了测量。

| 检查项 | 结果 |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200**——32 字符令牌，无需验证码、无需邮箱 |
| `GET /api/auth/get-session`（Bearer） | **200**——`expiresAt` 为 **30 天**后 |
| `GET /api/v1/me`（Bearer） | **200**——`{"user":{"type":"guest"}}` |
| `GET /api/v1/me`（无请求头） | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream`（Bearer） | **200**——`data:` 数据块，然后 `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream`（无认证） | **401** `{"error":"Unauthorized"}` |
| 同一令牌连续 8 次补全 | **8 × 200**——未达到每会话上限 |
| 仅限 Pro 的模型 ID | **200**，由 `n33-chat` 作答（静默替换） |
| 同一地址的登录突发请求 | 在一个窗口内约 3 次后返回 **429**——工具会控制节奏并重试 |
| 未通过聊天检查的令牌 | 绝不会写入 `keys.txt`；该账户会记录在 `accounts.json` 中 |
| 本地桥接 `POST /v1/chat/completions` | **200**——缓冲模式和 `stream: true` 均已验证 |

随时重新检查：

```bash
node src/cli.js --verify-only
```

## 🧭 工作原理

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| 步骤 | 调用 | 备注 |
| --- | --- | --- |
| 登录 | `POST /api/auth/sign-in/anonymous` | better-auth 访客路由；返回 `{token, user}` |
| 认证 | `Authorization: Bearer <token>` | *不*需要 cookie jar——接受 bearer 形式 |
| 回读 | `GET /api/auth/get-session` | 会话记录，`expiresAt` = +30 天 |
| 聊天 | `POST /api/chat/stream` | multipart：`message`、`model`、`history`、`webSearch`、`textChatMode`、`guestKey` |
| 应答 | `data: {"chunk":…}` … `{"done":true,"model":…}` | `model` 字段报告实际提供服务的 ID |
| 检查 | 200 **且**有文本**且**有 `done` | 任何不满足的情况都不会进入 `keys.txt` |
| 提供服务 | `node src/serve.js` | 将该协议转换为 OpenAI 的 `/v1/chat/completions` |

## ⚙️ CLI 选项

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| 标志 | 默认值 | 含义 |
| --- | --- | --- |
| `--count` | `50` | 要铸造多少个访客会话 |
| `--model` | `n33-chat` | 用于实时验证的模型 |
| `--conc` | `4` | 同时处理的账户数（受代理池大小限制） |
| `--gap` | `0.5` | 每个账户处理完后等待的秒数 |
| `--retries` | `6` | 每个账户的尝试次数（429 会以退避方式重试） |
| `--proxies` | `proxies.txt` | 代理列表文件 |
| `N33_PROXIES` | — | 用于覆盖列表路径的环境变量 |

## 🛰️ 使用代理

每个请求都会通过代理池中的一条代理线路发出，并且**一条线路固定绑定到一个账户**：登录限流是按地址实施的，因此在请求过程中切换出口会产生不必要的 429。一条失效线路会使该账户失败，工具会继续处理下一个；`--screen` 会在你耗费一次运行前告诉你哪些线路能到达 `n33.ai:443`。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | 每行一个经实时验证的访客令牌——已被 git 忽略 |
| `accounts.json` | 每个账户的出口 / 令牌 / 聊天状态 |
| `proxies.txt` | 你的出口，每行一个——已被 git 忽略 |
| `outputs/` | 运行日志——已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、OpenAI 兼容的路由器。由于 n33.ai 不是 OpenAI 形式，9Router 通信的对象是桥接服务——请先启动它，然后注册密钥：

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

默认值：`--base http://localhost:20128`、`--password 123456`、`--name "N33 AI"`、`--prefix n33`、`--base-url http://127.0.0.1:20177/v1`。随后模型会以 `n33/<model id>` 的形式提供，并在每个令牌之间进行负载均衡；每个连接携带 `keys.txt` 中的一个令牌，桥接服务会在该请求中使用它。

## 🔌 连接到 OmniRoute

[OmniRoute](https://omniroute.online) 是一个自托管、OpenAI 兼容的路由器。由于 n33.ai 不是 OpenAI 形式，OmniRoute 通信的对象是桥接服务——请先启动它，然后注册密钥：

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-omniroute.js    # registers the provider node + one connection per key
```

默认值：`--base http://localhost:20128`、`--password 123456`、`--name "N33 AI"`、`--prefix n33`、`--base-url http://127.0.0.1:20177/v1`。随后模型会以 `n33/<model id>` 的形式提供，并在每个令牌之间进行负载均衡；每个连接携带 `keys.txt` 中的一个令牌，桥接服务会在该请求中使用它。

## 🔑 一个密钥能带来什么

| | |
| --- | --- |
| 🏢 提供商 | **N33 AI**——[n33.ai](https://n33.ai) |
| 🎁 提供商提供什么 | 一个**访客会话**：无需账户、无需验证码、无需邮箱——一个有效期为 30 天的 32 字符令牌 |
| 🔑 一个令牌能带来什么 | 一个具有独立身份的访客会话，通过捆绑的桥接服务提供；没有可消耗的配额，只有面板按地址实施的登录限流 |
| 🌐 API 形态 | **通过捆绑的桥接服务**实现 OpenAI 兼容：`POST http://127.0.0.1:20177/v1/chat/completions`（产品本身响应 multipart `POST /api/chat/stream`） |
| 🔒 你的数据 | 仅涉及 `n33.ai`、你配置的代理以及本地桥接服务；令牌保留在你的机器上 |

## 🐞 问题

如果面板更改了登录路由、限流规则或流式帧格式，工具会在该步骤停止并说明情况——`node src/cli.js --verify-only` 是查看哪一部分出问题的最快方式。请附上你运行的命令和确切输出**[提交 issue](../../issues)**；欢迎提交 PR。

## 📄 许可证

MIT © 2026——见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 n33-bulk-apikey 贡献者

</div>