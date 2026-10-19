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

**Générez en masse des sessions de chat invité n33.ai — un canal sans captcha et sans boîte mail où chaque jeton a survécu à un appel de chat réel, exposé via un pont local compatible OpenAI.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-3-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Pourquoi cet outil existe

N33 AI est un produit de chat grand public — Claude, GPT et Grok derrière une seule page, un plan Pro à 250 $/an, et **aucune page de clé API**. Ce qu'il offre gratuitement, en revanche, c'est une **session invité** : `POST /api/auth/sign-in/anonymous` répond avec un jeton de 32 caractères, sans captcha, sans boîte mail et sans compte. Ce jeton authentifie le chat du produit lui-même (`Authorization: Bearer <token>`) et vit **30 jours**. Cet outil transforme ce canal en un `keys.txt` de jetons dont chacun a été prouvé par une complétion réelle — et fournit le pont compatible OpenAI qui les rend utilisables depuis n'importe quel client.

## 🎁 Offre gratuite — ce que vous obtenez

Il n'y a ni crédit d'inscription, ni carte, ni étape e-mail sur ce canal — l'offre gratuite **est** la session invité :

| Quoi | Valeur |
| --- | --- |
| Compte requis | **Non** — `POST /api/auth/sign-in/anonymous` |
| Captcha / Turnstile | **aucun** sur la route de connexion |
| Boîte mail requise | **Non** |
| Durée de vie de la session | **30 jours** (`/api/auth/get-session` renvoie `expiresAt`) |
| Limite de chat observée | aucun plafond par session atteint : 8 complétions séquentielles sur un seul jeton, toutes en 200 |
| Limite de génération | **~3 connexions par fenêtre et par adresse de sortie**, puis `429 Too many requests` |
| L'unité qui passe à l'échelle | **une sortie = un compte** → `--count N` signifie en réalité « N sessions invité » |

Comme le throttle est appliqué par **adresse**, le pool n'est pas un luxe ici : l'outil épingle une sortie sur un compte, et la taille du pool plafonne la concurrence utile.

> 💡 L'offre gratuite est définie par N33 AI et peut changer. Vérifiez les chiffres en direct sur [n33.ai](https://n33.ai) — et laissez le garde-fou de l'outil trancher :

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 3, sans exception

Les invités n'ont pas droit à tout le catalogue : les identifiants réservés au Pro (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) sont **silencieusement remplacés** par `n33-chat` plutôt que refusés — l'événement `done` nomme le modèle qui a réellement répondu. Trois identifiants répondent en leur propre nom :

| ID du modèle | Servi comme | Remarques |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | le défaut gratuit, toujours disponible |
| `n33-grok` | Grok | échelon gratuit de la famille xAI |
| `n33-gpt` | GPT | échelon gratuit de la famille OpenAI |

Tout autre identifiant du catalogue est accepté par le point de terminaison mais reçoit une réponse de `n33-chat`.

## 🧪 Comment utiliser l'API

N33 AI parle son propre protocole — un `POST /api/chat/stream` en multipart qui répond par des lignes d'événements `data: {...}` — donc rien qui s'attende à OpenAI ne peut lui parler directement. **`src/serve.js` est ce point de terminaison** : pointez n'importe quel client OpenAI dessus et les jetons de `keys.txt` se comportent comme de simples clés API.

```bash
# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

Le pont sert `n33-chat`, `n33-grok` et `n33-gpt`, prend en charge le streaming (`"stream": true`), alterne automatiquement entre les entrées de `keys.txt` et accepte n'importe quelle clé non vide — une clé présente dans `keys.txt` est utilisée pour cette requête, toute autre est prise en round-robin.

Parler directement au produit est également possible ; le jeton est un simple identifiant bearer :

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Démarrage rapide

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

`keys.txt` n'est écrit **qu'** après qu'une complétion de chat réelle a prouvé le jeton.

### 🖱️ Le lanceur

Le lanceur demande la liste de proxys, le nombre et le modèle de vérification, les mémorise dans `launcher.config.json`, et exécute la CLI avec les bons indicateurs. Son entrée `Connect to 9Router` enregistre les clés via le pont.

## ✅ Vérifié en conditions réelles — chaque clé est testée

Chaque affirmation ci-dessous a été mesurée sur le site en direct le **2026-10-19**.

| Vérification | Résultat |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — jeton de 32 caractères, sans captcha, sans boîte mail |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` à **30 jours** |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (sans en-tête) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — chunks `data:`, puis `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (sans authentification) | **401** `{"error":"Unauthorized"}` |
| 8 complétions séquentielles, un seul jeton | **8 × 200** — aucun plafond par session atteint |
| ID de modèles réservés au Pro | **200**, réponse de `n33-chat` (substitution silencieuse) |
| rafale de connexions depuis une même adresse | **429** après ~3 dans une fenêtre — l'outil temporise et réessaie |
| un jeton qui échoue à sa vérification de chat | jamais écrit dans `keys.txt` ; le compte est consigné dans `accounts.json` |
| pont local `POST /v1/chat/completions` | **200** — en mode tampon et avec `stream: true`, les deux vérifiés |

Revérifiez à tout moment :

```bash
node src/cli.js --verify-only
```

## 🧭 Comment ça marche

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Étape | Appel | Remarques |
| --- | --- | --- |
| connexion | `POST /api/auth/sign-in/anonymous` | route invité better-auth ; renvoie `{token, user}` |
| authentification | `Authorization: Bearer <token>` | le pot à cookies n'est *pas* nécessaire — la forme bearer est acceptée |
| relecture | `GET /api/auth/get-session` | enregistrement de session, `expiresAt` = +30 jours |
| chat | `POST /api/chat/stream` | multipart : `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| réponse | `data: {"chunk":…}` … `{"done":true,"model":…}` | le champ `model` indique l'identifiant qui a réellement servi la réponse |
| contrôle | 200 **et** du texte **et** `done` | en dessous de cela, rien n'atteint `keys.txt` |
| service | `node src/serve.js` | traduit ce protocole en `/v1/chat/completions` d'OpenAI |

## ⚙️ Options de la CLI

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Option | Défaut | Signification |
| --- | --- | --- |
| `--count` | `50` | nombre de sessions invité à générer |
| `--model` | `n33-chat` | modèle utilisé pour la vérification en direct |
| `--conc` | `4` | comptes en cours (plafonné par la taille du pool) |
| `--gap` | `0.5` | secondes d'attente après chaque compte |
| `--retries` | `6` | tentatives par compte (un 429 est réessayé avec backoff) |
| `--proxies` | `proxies.txt` | fichier de liste de proxys |
| `N33_PROXIES` | — | variable d'environnement qui remplace le chemin de la liste |

## 🛰️ Derrière un proxy

Chaque requête sort via une ligne de proxy de votre pool, et **une ligne est épinglée à un compte** : le throttle de connexion est appliqué par adresse, donc changer de sortie en cours de route ne produit que des 429 inutiles. Une ligne morte fait échouer ce compte et l'outil passe au suivant ; `--screen` vous indique quelles lignes atteignent `n33.ai:443` avant que vous ne consacriez une exécution à les tester.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | un jeton invité vérifié en direct par ligne — ignoré par git |
| `accounts.json` | sortie / jeton / état du chat par compte |
| `proxies.txt` | vos sorties, une par ligne — ignoré par git |
| `outputs/` | journal d'exécution — ignoré par git |

## 🔌 Connexion à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI. Comme n33.ai n'a pas la forme d'OpenAI, c'est le pont que 9Router interroge — démarrez-le d'abord, puis enregistrez les clés :

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Les modèles sont alors servis sous la forme `n33/<model id>` et répartis en équilibrage de charge entre tous les jetons ; chaque connexion transporte un jeton de `keys.txt`, que le pont utilise pour cette requête.

## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 Ce que le fournisseur offre | une **session invité** : ni compte, ni captcha, ni boîte mail — un jeton de 32 caractères valable 30 jours |
| 🔑 Ce qu'un jeton vous apporte | une session invité avec sa propre identité, servie via le pont fourni ; il n'y a pas de quota à consommer, seulement le throttle de connexion par adresse du panneau |
| 🌐 Forme de l'API | compatible OpenAI **via le pont fourni** : `POST http://127.0.0.1:20177/v1/chat/completions` (le produit lui-même répond à un `POST /api/chat/stream` en multipart) |
| 🔒 Vos données | seuls `n33.ai`, les proxys que vous configurez et le pont local sont impliqués ; les jetons restent sur votre machine |

## 🐞 Problèmes

Si le panneau change sa route de connexion, son throttle ou le cadrage de son flux, l'outil s'arrête à cette étape et le signale — `node src/cli.js --verify-only` est le moyen le plus rapide de voir quelle moitié a cassé. **[Ouvrez un ticket](../../issues)** avec la commande que vous avez exécutée et la sortie exacte ; les PR sont les bienvenues.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 contributeurs de n33-bulk-apikey

</div>