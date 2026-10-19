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

**Crie em massa sessões de chat de convidado do n33.ai — uma via sem captcha e sem caixa de correio em que cada token sobreviveu a uma chamada de chat ao vivo, servida por meio de uma ponte local compatível com OpenAI.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Início rápido](#-quick-start) · [🎁 Nível gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-3-of-them) · [🧪 Use a API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Como funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por que isto existe

O N33 AI é um produto de chat para consumidores — Claude, GPT e Grok atrás de uma única página, um plano Pro de US$ 250/ano e **nenhuma página de chave de API**. O que ele oferece gratuitamente é uma **sessão de convidado**: `POST /api/auth/sign-in/anonymous` responde com um token de 32 caracteres e sem captcha, sem caixa de correio e sem conta. Esse token autentica o chat do próprio produto (`Authorization: Bearer <token>`) e dura **30 dias**. Esta ferramenta transforma essa via em um `keys.txt` de tokens que foram comprovados individualmente com uma conclusão ao vivo — e entrega a ponte compatível com OpenAI que os torna utilizáveis a partir de qualquer cliente.

## 🎁 Nível gratuito — quanto você recebe

Nesta via não há crédito de cadastro, cartão nem etapa de e-mail — o nível gratuito **é** a sessão de convidado:

| Item | Valor |
| --- | --- |
| Conta necessária | **Não** — `POST /api/auth/sign-in/anonymous` |
| Captcha / Turnstile | **nenhum** na rota de login |
| Caixa de correio necessária | **Não** |
| Duração da sessão | **30 dias** (`/api/auth/get-session` informa `expiresAt`) |
| Limite de chat observado | nenhum teto por sessão atingido: 8 conclusões sequenciais em um token, todas 200 |
| Limite de geração | **~3 logins por janela por endereço de saída**, depois `429 Too many requests` |
| A unidade que escala | **uma saída = uma conta** → `--count N` na verdade significa "N sessões de convidado" |

Porque o limite é por **endereço**, o pool não é um luxo aqui: a ferramenta fixa uma saída a uma conta, e o tamanho do pool limita a concorrência útil.

> 💡 O nível gratuito é definido pelo N33 AI e pode mudar. Confira os números atuais em [n33.ai](https://n33.ai) — e deixe a própria verificação da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 3

Convidados não recebem o catálogo inteiro: os ids exclusivos do Pro (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) são **substituídos silenciosamente** por `n33-chat` em vez de recusados — o evento `done` informa o modelo que realmente respondeu. Três ids respondem como eles mesmos:

| Id do modelo | Servido como | Observações |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | o padrão gratuito, sempre disponível |
| `n33-grok` | Grok | nível gratuito da família xAI |
| `n33-gpt` | GPT | nível gratuito da família OpenAI |

Qualquer outra coisa no catálogo é aceita pelo endpoint, mas respondida por `n33-chat`.

## 🧪 Como usar a API

O N33 AI fala seu próprio protocolo — um `POST /api/chat/stream` multipart que responde em linhas de evento `data: {...}` — então nada que espere OpenAI consegue falar com ele diretamente. **`src/serve.js` é esse endpoint**: aponte qualquer cliente OpenAI para ele e os tokens em `keys.txt` se comportam como chaves de API comuns.

```bash
# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

A ponte serve `n33-chat`, `n33-grok` e `n33-gpt`, oferece suporte a streaming (`"stream": true`), alterna automaticamente entre as chaves de `keys.txt` e aceita qualquer chave não vazia — uma chave que está em `keys.txt` é usada para aquela requisição; qualquer outra entra no rodízio.

Também é possível falar diretamente com o produto; o token é uma credencial bearer comum:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Início rápido

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

`keys.txt` é gravado **somente** depois que uma conclusão de chat ao vivo comprova o token.

### 🖱️ O inicializador

O inicializador solicita a lista de proxies, a contagem e o modelo de verificação, memoriza esses dados em `launcher.config.json` e executa a CLI com as flags corretas. Seu item `Connect to 9Router` registra as chaves por meio da ponte.

## ✅ Verificado e funcionando — cada chave é testada

Todas as afirmações abaixo foram medidas no site ao vivo em **2026-10-19**.

| Verificação | Resultado |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — token de 32 caracteres, sem captcha, sem caixa de correio |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` **30 dias** à frente |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (sem cabeçalho) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — chunks `data:`, depois `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (sem auth) | **401** `{"error":"Unauthorized"}` |
| 8 conclusões sequenciais, um token | **8 × 200** — nenhum teto por sessão atingido |
| ids de modelo exclusivos do Pro | **200**, respondidos por `n33-chat` (substituição silenciosa) |
| rajada de login de um endereço | **429** após ~3 em uma janela — a ferramenta controla o ritmo e tenta novamente |
| um token que falha na verificação de chat | nunca gravado em `keys.txt`; a conta é registrada em `accounts.json` |
| ponte local `POST /v1/chat/completions` | **200** — com buffer e `stream: true`, ambos verificados |

Verifique novamente a qualquer momento:

```bash
node src/cli.js --verify-only
```

## 🧭 Como funciona

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Etapa | Chamada | Observações |
| --- | --- | --- |
| login | `POST /api/auth/sign-in/anonymous` | rota de convidado do better-auth; retorna `{token, user}` |
| auth | `Authorization: Bearer <token>` | o cookie jar *não* é necessário — a forma bearer é aceita |
| leitura de confirmação | `GET /api/auth/get-session` | registro da sessão, `expiresAt` = +30 dias |
| chat | `POST /api/chat/stream` | multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| resposta | `data: {"chunk":…}` … `{"done":true,"model":…}` | o campo `model` informa o id que realmente a atendeu |
| verificação | 200 **e** texto **e** `done` | qualquer coisa menos que isso nunca chega a `keys.txt` |
| servir | `node src/serve.js` | traduz esse protocolo para OpenAI `/v1/chat/completions` |

## ⚙️ Opções da CLI

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Flag | Padrão | Significado |
| --- | --- | --- |
| `--count` | `50` | quantas sessões de convidado gerar |
| `--model` | `n33-chat` | modelo usado para a verificação ao vivo |
| `--conc` | `4` | contas em andamento (limitado pelo tamanho do pool) |
| `--gap` | `0.5` | segundos de espera após cada conta |
| `--retries` | `6` | tentativas por conta (429 é tentado novamente com backoff) |
| `--proxies` | `proxies.txt` | arquivo da lista de proxies |
| `N33_PROXIES` | — | substituição por variável de ambiente para o caminho da lista |

## 🛰️ Atrás de um proxy

Cada requisição sai por uma linha de proxy do seu pool, e **uma linha é fixada a uma conta**: o limite de login é por endereço, então trocar de saída durante a execução é o que produz 429s desnecessários. Uma linha morta faz aquela conta falhar e a ferramenta segue em frente; `--screen` informa quais linhas alcançam `n33.ai:443` antes de você gastar uma execução com elas.

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `keys.txt` | um token de convidado verificado ao vivo por linha — ignorado pelo git |
| `accounts.json` | status de saída / token / chat por conta |
| `proxies.txt` | suas saídas, uma por linha — ignorado pelo git |
| `outputs/` | log de execução — ignorado pelo git |

## 🔌 Conectar ao 9Router

O [9Router](https://9router.com) é um roteador auto-hospedado e compatível com OpenAI. Como o n33.ai não tem o formato da OpenAI, a ponte é com quem o 9Router fala — inicie-a primeiro e depois registre as chaves:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

Padrões: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Os modelos então são servidos como `n33/<model id>` e com balanceamento de carga entre todos os tokens; cada conexão carrega um token de `keys.txt`, que a ponte usa para aquela requisição.

## 🔑 O que uma chave lhe dá

| | |
| --- | --- |
| 🏢 Provedor | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 O que o provedor oferece | uma **sessão de convidado**: sem conta, sem captcha, sem caixa de correio — um token de 32 caracteres que dura 30 dias |
| 🔑 O que um token lhe dá | uma sessão de convidado com identidade própria, servida pela ponte incluída; não há cota a gastar, apenas o limite de login por endereço do painel |
| 🌐 Formato da API | compatível com OpenAI **por meio da ponte incluída**: `POST http://127.0.0.1:20177/v1/chat/completions` (o produto em si responde a um `POST /api/chat/stream` multipart) |
| 🔒 Seus dados | apenas `n33.ai`, os proxies que você configura e a ponte local estão envolvidos; os tokens ficam na sua máquina |

## 🐞 Problemas

Se o painel mudar sua rota de login, seu limite ou seu enquadramento de stream, a ferramenta para naquela etapa e avisa — `node src/cli.js --verify-only` é a maneira mais rápida de ver qual metade quebrou. **[Abra uma issue](../../issues)** com o comando que você executou e a saída exata; PRs são bem-vindos.

## 📄 Licença

MIT © 2026 — consulte [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 colaboradores do n33-bulk-apikey

</div>