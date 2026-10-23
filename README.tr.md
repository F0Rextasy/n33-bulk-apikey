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

**Toplu olarak n33.ai misafir sohbet oturumları üretin — her token'ın canlı bir sohbet çağrısından geçtiği, captcha'sız ve posta kutusuz bir hat; yerel, OpenAI uyumlu bir köprü üzerinden sunulur.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://n33.ai/chat)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-3-of-them) · [🧪 API'yi kullanın](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

N33 AI bir tüketici sohbet ürünüdür — tek bir sayfada Claude, GPT ve Grok, yıllık 250 $'lık bir Pro planı ve **hiç API anahtarı sayfası yok**. Ücretsiz olarak dağıttığı şey bir **misafir oturumudur**: `POST /api/auth/sign-in/anonymous` captcha, posta kutusu ve hesap olmadan 32 karakterlik bir token döndürür. Bu token ürünün kendi sohbetini (`Authorization: Bearer <token>`) doğrular ve **30 gün** yaşar. Bu araç, o hattı her biri canlı bir tamamlama ile kanıtlanmış token'lardan oluşan bir `keys.txt` dosyasına dönüştürür — ve bunları herhangi bir istemciden kullanılabilir kılan OpenAI uyumlu köprüyü de beraberinde getirir.

## 🎁 Ücretsiz katman — ne kadar alıyorsunuz

Bu hatta kayıt kredisi, kart ve e-posta adımı yoktur — ücretsiz katman **misafir oturumunun ta kendisidir**:

| Ne | Değer |
| --- | --- |
| Gerekli hesap | **Yok** — `POST /api/auth/sign-in/anonymous` |
| Captcha / Turnstile | giriş rotasında **yok** |
| Gerekli posta kutusu | **Yok** |
| Oturum ömrü | **30 gün** (`/api/auth/get-session` `expiresAt` bildirir) |
| Gözlemlenen sohbet limiti | oturum başına bir sınıra çarpılmadı: tek token ile art arda 8 tamamlama, hepsi 200 |
| Üretim limiti | **çıkış adresi başına pencere başına ~3 giriş**, ardından `429 Too many requests` |
| Ölçeklenen birim | **bir çıkış = bir hesap** → `--count N` aslında "N misafir oturumu" demektir |

Kısıtlama **adres** başına olduğu için havuz burada bir lüks değil: araç bir çıkışı bir hesaba sabitler ve havuz boyutu faydalı eşzamanlılığı sınırlar.

> 💡 Ücretsiz katman N33 AI tarafından belirlenir ve değişebilir. Güncel sayıları [n33.ai](https://n33.ai) adresinden kontrol edin — ve kararı aracın kendi kapısına bırakın:

```bash
node src/cli.js --verify-only     # every token in keys.txt is re-tested with a real chat call
```

## 🤖 Modeller — üçü de

Misafirlere tüm katalog sunulmaz: yalnızca Pro'ya özel kimlikler (`n33-claude-opus`, `n33-claude-fable`, `n33-gpt-terra`, `n33-gpt-sol`, `n33-gpt-astra`, `n33-gpt-5-5`, `n33-grok-4-6`, `n33-grok-4-7`, `n33-claude-sonnet`) reddedilmek yerine `n33-chat` ile **sessizce değiştirilir** — `done` olayı gerçekte yanıt veren modelin adını belirtir. Üç kimlik kendisi olarak yanıt verir:

| Model kimliği | Sunulduğu model | Notlar |
| --- | --- | --- |
| `n33-chat` | Claude Haiku 5.5 | ücretsiz varsayılan, her zaman kullanılabilir |
| `n33-grok` | Grok | xAI ailesinin ücretsiz basamağı |
| `n33-gpt` | GPT | OpenAI ailesinin ücretsiz basamağı |

Katalogdaki başka her şey uç nokta tarafından kabul edilir ancak `n33-chat` tarafından yanıtlanır.

## 🧪 API nasıl kullanılır

N33 AI kendi protokolünü konuşur — `data: {...}` olay satırlarıyla yanıt veren multipart bir `POST /api/chat/stream` — dolayısıyla OpenAI bekleyen hiçbir şey onunla doğrudan konuşamaz. **`src/serve.js` işte o uç noktadır**: herhangi bir OpenAI istemcisini ona yönlendirin ve `keys.txt` içindeki token'lar sıradan API anahtarları gibi davransın.

```bash

# terminal 1 — the bridge (defaults to http://127.0.0.1:20177/v1)
node src/serve.js

# terminal 2 — any OpenAI-shaped request
curl http://127.0.0.1:20177/v1/chat/completions \
  -H "Authorization: Bearer <token from keys.txt>" \
  -H "Content-Type: application/json" \
  -d '{"model":"n33-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":8}'
```

Köprü `n33-chat`, `n33-grok` ve `n33-gpt` modellerini sunar, akışı (`"stream": true`) destekler, `keys.txt` üzerinde otomatik olarak döner ve boş olmayan her anahtarı kabul eder — `keys.txt` içinde bulunan bir anahtar o istek için kullanılır, diğer her şey sırayla döner.

Ürünle doğrudan konuşmak da mümkündür; token sade bir bearer kimlik bilgisidir:

```bash
TOKEN=$(head -1 keys.txt)
curl -s https://n33.ai/api/auth/get-session -H "Authorization: Bearer $TOKEN"   # session + expiry
curl -s https://n33.ai/api/v1/me          -H "Authorization: Bearer $TOKEN"   # {"user":{"type":"guest"}}
```

## 🛠 Hızlı başlangıç

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

`keys.txt` **yalnızca** canlı bir sohbet tamamlaması token'ı kanıtladıktan sonra yazılır.

### 🖱️ Başlatıcı

Başlatıcı proxy listesini, sayıyı ve doğrulama modelini sorar, bunları `launcher.config.json` içinde hatırlar ve CLI'yi doğru bayraklarla çalıştırır. `Connect to 9Router` öğesi anahtarları köprü üzerinden kaydeder.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

Aşağıdaki her iddia **2026-10-19** tarihinde canlı siteye karşı ölçülmüştür.

| Kontrol | Sonuç |
| --- | --- |
| `POST /api/auth/sign-in/anonymous` | **200** — 32 karakterlik token, captcha yok, posta kutusu yok |
| `GET /api/auth/get-session` (Bearer) | **200** — `expiresAt` **30 gün** sonrası |
| `GET /api/v1/me` (Bearer) | **200** — `{"user":{"type":"guest"}}` |
| `GET /api/v1/me` (başlık yok) | **401** `{"error":{"code":"UNAUTHENTICATED"}}` |
| `POST /api/chat/stream` (Bearer) | **200** — `data:` parçaları, ardından `{"done":true,"model":"n33-chat"}` |
| `POST /api/chat/stream` (kimlik doğrulama yok) | **401** `{"error":"Unauthorized"}` |
| tek token ile art arda 8 tamamlama | **8 × 200** — oturum başına bir sınıra ulaşılmadı |
| yalnızca Pro model kimlikleri | **200**, `n33-chat` tarafından yanıtlanır (sessiz değiştirme) |
| tek adresten giriş patlaması | bir pencerede ~3'ten sonra **429** — araç hızı ayarlar ve yeniden dener |
| sohbet kontrolünden geçemeyen bir token | `keys.txt`'e asla yazılmaz; hesap `accounts.json` içine kaydedilir |
| yerel köprü `POST /v1/chat/completions` | **200** — tamponlanmış ve `stream: true` ikisi de doğrulandı |

İstediğiniz zaman yeniden kontrol edin:

```bash
node src/cli.js --verify-only
```

## 🧭 Nasıl çalışır

```
exits (one per account, the throttle is per address)         one exit pinned to one account
   │
   ├─▶ sign-in: POST /api/auth/sign-in/anonymous → 32-char guest token (no captcha, no mailbox)
   ├─▶ (optional read-back: GET /api/auth/get-session → Bearer accepted, 30-day expiry)
   └─▶ live proof: POST /api/chat/stream → data: chunks + {"done":true} = the token is live
```

| Adım | Çağrı | Notlar |
| --- | --- | --- |
| giriş | `POST /api/auth/sign-in/anonymous` | better-auth misafir rotası; `{token, user}` döndürür |
| kimlik doğrulama | `Authorization: Bearer <token>` | çerez kavanozu *gerekli değildir* — bearer biçimi kabul edilir |
| geri okuma | `GET /api/auth/get-session` | oturum kaydı, `expiresAt` = +30 gün |
| sohbet | `POST /api/chat/stream` | multipart: `message`, `model`, `history`, `webSearch`, `textChatMode`, `guestKey` |
| yanıt | `data: {"chunk":…}` … `{"done":true,"model":…}` | `model` alanı gerçekte hizmet veren kimliği bildirir |
| kontrol | 200 **ve** metin **ve** `done` | bunlardan azı `keys.txt`'e asla ulaşmaz |
| sunum | `node src/serve.js` | bu protokolü OpenAI `/v1/chat/completions` biçimine çevirir |

## ⚙️ CLI seçenekleri

```bash
node src/cli.js --count 100 --conc 6      # mint (default 50, conc 4)
node src/cli.js --verify-only             # re-check every token in keys.txt
node src/cli.js --screen                  # test the proxy list against n33.ai
node src/cli.js --help
node src/serve.js --port 20177            # OpenAI-compatible bridge
```

| Bayrak | Varsayılan | Anlamı |
| --- | --- | --- |
| `--count` | `50` | kaç misafir oturumu üretileceği |
| `--model` | `n33-chat` | canlı doğrulama için kullanılan model |
| `--conc` | `4` | uçuştaki hesap sayısı (havuz boyutuyla sınırlanır) |
| `--gap` | `0.5` | her hesaptan sonra beklenecek saniye |
| `--retries` | `6` | hesap başına deneme (429 geri çekilmeyle yeniden denenir) |
| `--proxies` | `proxies.txt` | proxy listesi dosyası |
| `N33_PROXIES` | — | liste yolu için ortam değişkeni geçersiz kılması |

## 🛰️ Proxy arkasında

Her istek havuzunuzdan bir proxy satırı üzerinden çıkar ve **bir satır bir hesaba sabitlenir**: giriş kısıtlaması adres başınadır, dolayısıyla iş sırasında çıkışlar arasında atlamak gereksiz 429'lara yol açar. Ölü bir satır o hesabı başarısız kılar ve araç yoluna devam eder; `--screen` bir çalışma harcamadan önce hangi satırların `n33.ai:443` adresine ulaştığını size söyler.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | satır başına bir canlı doğrulanmış misafir token'ı — git tarafından yok sayılır |
| `accounts.json` | hesap başına çıkış / token / sohbet durumu |
| `proxies.txt` | çıkışlarınız, satır başına bir tane — git tarafından yok sayılır |
| `outputs/` | çalışma günlüğü — git tarafından yok sayılır |

## 🔌 9Router'a bağlanın

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. n33.ai OpenAI biçiminde olmadığı için 9Router'ın konuştuğu şey köprüdür — önce onu başlatın, sonra anahtarları kaydedin:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-9router.js    # registers the provider node + one connection per key
```

Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Modeller ardından `n33/<model id>` olarak sunulur ve her token üzerinde yük dengelenir; her bağlantı `keys.txt`'ten bir token taşır ve köprü bunu o istek için kullanır.

## 🔌 OmniRoute'a bağlanın

[OmniRoute](https://omniroute.online) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. n33.ai OpenAI biçiminde olmadığı için OmniRoute'ın konuştuğu şey köprüdür — önce onu başlatın, sonra anahtarları kaydedin:

```bash
node src/serve.js &            # http://127.0.0.1:20177/v1
node src/connect-omniroute.js    # registers the provider node + one connection per key
```

Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "N33 AI"`, `--prefix n33`, `--base-url http://127.0.0.1:20177/v1`. Modeller ardından `n33/<model id>` olarak sunulur ve her token üzerinde yük dengelenir; her bağlantı `keys.txt`'ten bir token taşır ve köprü bunu o istek için kullanır.

## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **N33 AI** — [n33.ai](https://n33.ai) |
| 🎁 Sağlayıcının verdikleri | bir **misafir oturumu**: hesap yok, captcha yok, posta kutusu yok — 30 gün yaşayan 32 karakterlik bir token |
| 🔑 Bir token size ne kazandırır | kendi kimliğine sahip bir misafir oturumu, paketlenmiş köprü üzerinden sunulur; harcanacak bir kota yoktur, yalnızca panelin adres başına giriş kısıtlaması vardır |
| 🌐 API biçimi | **paketlenmiş köprü üzerinden** OpenAI uyumlu: `POST http://127.0.0.1:20177/v1/chat/completions` (ürünün kendisi multipart bir `POST /api/chat/stream` yanıtlar) |
| 🔒 Verileriniz | yalnızca `n33.ai`, yapılandırdığınız proxy'ler ve yerel köprü devreye girer; token'lar makinenizde kalır |

## 🐞 Sorunlar

Panel giriş rotasını, kısıtlamasını veya akış çerçevelemesini değiştirirse araç o adımda durur ve bunu söyler — `node src/cli.js --verify-only` hangi yarının bozulduğunu görmenin en hızlı yoludur. Çalıştırdığınız komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**; PR'lar memnuniyetle karşılanır.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 n33-bulk-apikey katkıda bulunanları

</div>