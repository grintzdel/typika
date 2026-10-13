# Héberger Typika

Statut : guide · aligné sur les fichiers du dépôt (`Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`,
`.env.example`) depuis le M1, et sur le profil Compose `kotlin` depuis le lot 3 du M6. Vercel (§5) reste à faire.

Contexte : [architecture.md](../specs/architecture.md) pour les composants, [security.md](../specs/security.md) pour les
en-têtes et l'isolation.

## 1. Ce qu'il faut héberger

| Composant | Obligatoire | Rôle |
|---|---|---|
| `web` | oui | Statique (hub prérendu, sandbox SPA, runtime frame) + `POST /api/github/token` |
| Deux origines | oui | App et runtime. Instance publique : deux **sites différents** ; instance privée : un sous-domaine suffit ([security.md](../specs/security.md) §2.1) |
| `kotlin-compiler` | non | Compilation Kotlin ; sans lui, les templates Kotlin sont masqués |
| Application OAuth GitHub | non | Sans elle, partage par gist et export GitHub désactivés |
| CDN d'assets | non | Assets lourds (WASM) ; par défaut un CDN public, auto-hébergeable |

**Mode statique pur** : sans endpoint ni service Kotlin, l'app reste utilisable (hub, sandbox TS / JS / Go, partage
par URL, export zip). Toute plateforme qui sert du statique avec des en-têtes personnalisés suffit.

## 2. Variables d'environnement

Lues **au démarrage du conteneur**, pas au build : une même image sert plusieurs instances. Le serveur expose les
valeurs publiques au client via `/config.json`.

| Variable | Obligatoire | Publique | Exemple | Rôle |
|---|---|---|---|---|
| `TYPIKA_PUBLIC_URL` | oui | oui | `https://typika.example.org` | Origine de l'app |
| `TYPIKA_RUNTIME_ORIGIN` | oui | oui | `https://typika-run.example.net` | Origine de la runtime frame, site différent de l'app |
| `TYPIKA_REGISTRY_INDEX_URL` | non | oui | `https://…/index.json` | Index du registre ; défaut : `/registry/index.json`, servi par l'app jusqu'au lot 7 du M3. Les artefacts Kotlin sont lus à côté, dans `artifacts/kotlin/` |
| `TYPIKA_TEMPLATE_FILE_URL_TEMPLATE` | non | oui | `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}` | Fichier d'un template à sa ref épinglée ([0022](../decisions/0022-template-files-source.md)) ; défaut : le miroir de l'app |
| `TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE` | non | oui | `https://data.jsdelivr.com/v1/packages/gh/{owner}/{repo}@{ref}?structure=flat` | Liste des fichiers d'un dépôt à un commit, au format de jsDelivr ; défaut : le miroir de l'app |
| `TYPIKA_ASSETS_BASE_URL` | non | oui | `https://cdn.jsdelivr.net/npm/@typika/runtime-assets@1.0.0/` | Base des assets de runtime. Pas encore lue : l'image sert ses propres assets ([0027](../decisions/0027-go-assets-delivery.md)) |
| `TYPIKA_PACKAGE_URL_TEMPLATE` | non | oui | `https://esm.sh/{name}@{version}{path}` | CDN ESM des dépendances npm des templates `browser-js` ; défaut : jsDelivr ([runtimes](../specs/runtimes.md) §6.1) |
| `TYPIKA_EMBED_ENABLED` | non | oui | `true` | Active `/embed/*` |
| `KOTLIN_COMPILER_URL` | non | non | `http://kotlin-compiler:8080` | Adresse interne du service de compilation, que l'app relaie sous `/api/kotlin` ([0029](../decisions/0029-kotlin-relay-rate-limit.md)) ; absent ⇒ Kotlin désactivé |
| `TYPIKA_KOTLIN_RATE_PER_MINUTE` | non | non | `20` | Compilations par minute et par IP ; au-delà, `429` |
| `TYPIKA_KOTLIN_RATE_BURST` | non | non | `10` | Compilations d'avance qu'une IP peut enchaîner |
| `TYPIKA_TRUST_PROXY` | non | non | `true` | L'IP du client est le dernier `X-Forwarded-For` ; seulement derrière un proxy qui réécrit cet en-tête (Caddy). `docker-compose.yml` le fixe à `true` |
| `GITHUB_CLIENT_ID` | non | oui | `Iv1.…` | Application OAuth ; absent ⇒ fonctions GitHub désactivées |
| `GITHUB_CLIENT_SECRET` | si `GITHUB_CLIENT_ID` | **non** | — | Échange `code` → token, jamais exposé au client |
| `PORT` | non | non | `3000` | Port d'écoute du service `web` |
| `NODE_ENV` | non | non | `production` | — |

Variables du service `kotlin-compiler` :

| Variable | Défaut | Rôle |
|---|---|---|
| `KOTLIN_COMPILER_ALLOWED_ORIGIN` | — | Origine autorisée en CORS (l'app) ; inutile si le service est derrière le même domaine |
| `KOTLIN_COMPILER_MAX_BODY_KB` | `256` | Taille max des sources |
| `KOTLIN_COMPILER_TIMEOUT_MS` | `15000` | Timeout de compilation ; au-delà, le processus de compilation est tué et la réponse est `504` |
| `KOTLIN_COMPILER_CONCURRENCY` | `2` | Processus de compilation, donc compilations simultanées ; les suivantes attendent |
| `KOTLIN_COMPILER_QUEUE_MAX` | `20` | Compilations en attente ; au-delà, réponse `503` |
| `KOTLIN_COMPILER_CACHE_MB` | `32` | Cache mémoire des artefacts (`0` pour désactiver) |
| `KOTLIN_COMPILER_WORKER_JAVA_OPTS` | voir [0028](../decisions/0028-kotlin-compilation-workers.md) | Options JVM des processus de compilation |

Avec Compose, ces variables se règlent dans `.env`, d'où `docker-compose.yml` reprend `CONCURRENCY`, `QUEUE_MAX`,
`TIMEOUT_MS` et `CACHE_MB` ; le service ne lit pas le reste de `.env`, qui peut contenir des secrets de `web`.
`KOTLIN_COMPILER_MEMORY` (`1g`) et `KOTLIN_COMPILER_CPUS` (`2`) plafonnent le conteneur : les monter avec la
concurrence.

Une file pleine et un processus de compilation planté répondent tous deux `503` avec `Retry-After: 5`, que le relais
transmet. Le relais répond lui-même `503` avec `Retry-After: 5` quand le service est injoignable ou ne répond pas en
25 s.

Valeurs alignées sur [runtimes.md](../specs/runtimes.md) §8. Dimensionnement mesuré au lot 1 du M6
([0028](../decisions/0028-kotlin-compilation-workers.md)) : avec 2 vCPU et 1 Gio, 2 processus de compilation tiennent
2,4 compilations par seconde de `strategy-kotlin`, avec un pic à 815 Mio. Chaque processus de plus coûte environ
380 Mio.

L'image se lance comme ceci hors de Compose, avec les protections de [security §3.3](../specs/security.md) :

```sh
docker build -t typika-kotlin-compiler services/kotlin-compiler
docker run --read-only --tmpfs /tmp:size=64m --cap-drop ALL --security-opt no-new-privileges \
  --memory 1g --cpus 2 -p 127.0.0.1:8080:8080 typika-kotlin-compiler
```

## 3. Build

```sh
pnpm install --frozen-lockfile
pnpm --filter @typika/web build
```

Le build produit `apps/web/dist/` : `client/` (assets, shell SPA `_shell.html` et pages du hub prérendues), `runtime/` (runtime frame), `server/` (handler
TanStack Start des routes serveur) et `node/main.js`, le serveur de production. Les deux bundles serveur embarquent
leurs dépendances : `dist/` suffit pour lancer l'app avec `node dist/node/main.js`, sans `node_modules`.

Le build écrit aussi l'index du registre (plugin Vite `registry-index`) et le miroir des templates à leur ref épinglée
(`pnpm --filter @typika/web build:registry`) dans `dist/client/registry/`. Tous deux lisent l'historique Git : le build
demande un clone complet et `git`. Les
fichiers sous `/registry/gh/` et `/registry/listing/` sont servis comme immuables, l'index en `no-cache`. Si les trois
URL du registre pointent sur une autre origine, elle doit répondre avec CORS ou `Cross-Origin-Resource-Policy:
cross-origin`, et la CSP de l'app l'ajoute à `connect-src`.

Le prérendu du hub lit l'index du registre **au build**. Pour que les pages du hub suivent le registre :

- reconstruire l'image à chaque publication de l'index (webhook du registre ou build planifié) ;
- en attendant, l'accueil et la liste montrent l'index du build. La page d'un template absent du build est servie par
  le shell, et le client la rend à partir de `TYPIKA_REGISTRY_INDEX_URL` ([0023](../decisions/0023-hub-prerendering.md)).

Le serveur sert `<chemin>/index.html` quand le build l'a prérendu, avec une CSP qui autorise les scripts inline de
cette page, et le shell sinon.

## 4. Docker (cible principale)

### 4.1 Le serveur `web` pose les en-têtes

Le serveur de production (`apps/web/server/`) sert les deux origines depuis un seul port et choisit selon l'en-tête
`Host` :

- **hôte runtime** (celui de `TYPIKA_RUNTIME_ORIGIN`) : uniquement `/runtime/*` (runtime frame, assets,
  `/runtime/config.json`). Toute autre URL répond `404` : aucune page de l'app n'est servie sur l'origine runtime.
- **tout autre hôte** : l'app. `/config.json` et `/api/*` vont au handler TanStack Start, les fichiers de
  `dist/client/` sont servis tels quels, les autres chemins reçoivent le shell SPA. `/runtime/*` répond `404`.

Il pose lui-même COOP, COEP, CORP, CSP, `Referrer-Policy` et `X-Content-Type-Options` selon l'hôte et le chemin
([security.md](../specs/security.md) §4). Les scripts inline du shell sont autorisés par leur hash, calculé au
démarrage. Tous les scripts de l'app portent `Cross-Origin-Embedder-Policy: require-corp`, sans quoi une page isolée
refuse d'y démarrer un worker (celui du language service de l'éditeur). L'image est donc correcte derrière n'importe quel reverse proxy ; celui-ci n'ajoute que TLS, HSTS et la
compression. Les assets hashés (`/assets/*`, `/runtime/assets/*`) sont servis avec
`Cache-Control: public, max-age=31536000, immutable`, le reste avec `no-cache`.

### 4.2 Dockerfile

Multi-stage, image de base `node:24-slim` épinglée par digest :

1. **`build`** : installe `git` (le miroir des templates lit l'historique, d'où `.git` dans le contexte), active pnpm via Corepack, `pnpm fetch` sur le lockfile (couche mise en cache tant que le lockfile ne
   change pas), copie les sources, `pnpm install --offline --frozen-lockfile`, `pnpm --filter @typika/web build`.
2. **`runtime`** : copie uniquement `apps/web/dist/`, utilisateur `node` (uid 1000), `EXPOSE 3000`, `HEALTHCHECK` sur
   `GET /`. Environ 370 Mo, dont l'essentiel est l'image Node.

Le conteneur ne lit ni n'écrit rien d'autre que `dist/` : il tourne avec `read_only: true` et sans capabilities.

### 4.3 docker-compose.yml et Caddyfile

`docker-compose.yml` lance `web` (construit depuis le `Dockerfile`) derrière Caddy, qui attend que `web` soit
`healthy`. `deploy/Caddyfile` déclare les deux domaines (`TYPIKA_APP_DOMAIN`, `TYPIKA_RUNTIME_DOMAIN`), obtient les
certificats, ajoute HSTS, compresse, retire l'en-tête `Server` et transmet tout à `web:3000` en conservant `Host`.

Le service Kotlin est dans le profil Compose `kotlin`. Il n'est branché qu'au réseau `kotlin`, déclaré `internal` :
aucun accès sortant, et seul `web`, branché aux deux réseaux, le joint. Caddy ne le voit pas. `web` le relaie sous
`/api/kotlin` et limite le débit par IP ([0029](../decisions/0029-kotlin-relay-rate-limit.md)) ; Compose fixe
`TYPIKA_TRUST_PROXY=true`, puisque Caddy remplace le `X-Forwarded-For` reçu par l'adresse qu'il voit. Le conteneur du
service reprend les protections de [security §3.3](../specs/security.md) : FS en lecture seule, `tmpfs` de 64 Mio
sur `/tmp`, sans capabilities, 1 Gio sans swap, 2 CPU, 256 processus.

### 4.4 Démarrage

```sh
cp .env.example .env            # renseigner les variables du §2 et les deux domaines
docker compose up -d --build
```

Avec Kotlin, décommenter `KOTLIN_COMPILER_URL=http://kotlin-compiler:8080` dans `.env`, puis :

```sh
docker compose --profile kotlin up -d --build
```

Sans le profil, laisser `KOTLIN_COMPILER_URL` commenté : sinon l'app propose Kotlin et chaque compilation répond
`503`.

### 4.5 Test de charge du service Kotlin

`services/kotlin-compiler/scripts/load-test.ts` mesure le service à travers Caddy et le relais, sur la pile Compose
lancée avec le profil `kotlin`. Deux scénarios :

```sh
# limites par défaut : une rafale d'un même client reçoit des 429 avec Retry-After
pnpm --filter @typika/kotlin-compiler load-test --app http://localhost --scenario rate --requests 30
# relancer web avec TYPIKA_KOTLIN_RATE_BURST=1000 : 60 compilations simultanées et deux compilations piégées
pnpm --filter @typika/kotlin-compiler load-test --app http://localhost --scenario saturate --requests 60
```

Le second scénario échoue si une compilation répond autre chose que `200` ou `503`, si la file pleine ne répond pas
`503` avec `Retry-After`, si les compilations piégées ne reçoivent pas `504`, si le conteneur dépasse sa limite
mémoire, est tué pour mémoire ou redémarre, ou si le service ne compile plus après la charge. Pour l'essai en local,
`TYPIKA_APP_DOMAIN=http://localhost` et `TYPIKA_RUNTIME_DOMAIN=http://127.0.0.1` font servir Caddy en HTTP.

Essai local sans Caddy, deux sites sur le même port :

```sh
docker build -t typika-web .
docker run --rm -p 3200:3000 --read-only --cap-drop ALL \
  -e TYPIKA_PUBLIC_URL=http://localhost:3200 -e TYPIKA_RUNTIME_ORIGIN=http://127.0.0.1:3200 typika-web
```

`localhost` et `127.0.0.1` sont des sites différents et des contextes sécurisés : la runtime frame y est isolée comme
en production.

## 5. Vercel

- Projet Vercel sur `apps/web`, deux domaines rattachés : celui de l'app et celui du runtime.
- Les en-têtes doivent être déclarés dans `vercel.ts` avec des règles par hôte (`has: [{ type: 'host', value: … }]`)
  et par chemin, avec les mêmes valeurs que le serveur `web` (§4.1, `apps/web/server/security-headers.ts`). Non fait
  au M1 ; la syntaxe exacte est à vérifier contre `@vercel/config`.
- `POST /api/github/token` tourne en fonction Vercel (runtime Node par défaut).
- **Le service Kotlin ne tourne pas sur Vercel** : c'est un conteneur JVM avec une file et des limites réseau. Le
  déployer sur un VPS ou un service de conteneurs managé. Le relais `/api/kotlin` et son rate limiting vivent dans le
  serveur Node de l'app ([0029](../decisions/0029-kotlin-relay-rate-limit.md)) : à porter en fonction Vercel, à
  faire avec le reste de ce §5.
- Variables d'env via `vercel env` ; `GITHUB_CLIENT_SECRET` uniquement en environnement serveur.

## 6. Autres plateformes

Exigences pour toute plateforme :

1. Servir le statique avec des **en-têtes différents par hôte et par chemin** (COOP, COEP, CORP, CSP).
2. Rattacher deux domaines de sites différents.
3. Optionnel : exécuter une fonction pour `POST /api/github/token`.

| Plateforme | En-têtes | Endpoint | Remarque |
|---|---|---|---|
| Cloudflare Pages | fichier `_headers` | Pages Functions | À tester : règles d'en-têtes par hôte |
| Netlify | fichier `_headers` ou `netlify.toml` | Netlify Functions | Idem |
| Hébergement statique simple (S3 + CDN, GitHub Pages) | selon le CDN | non | Mode statique pur ; GitHub Pages ne permet pas d'en-têtes personnalisés, donc **ne convient pas** |

## 7. Assets lourds

Les assets de runtime (WASM d'esbuild, toolchain Go) sont dans l'image et servis par le domaine runtime
([0027](../decisions/0027-go-assets-delivery.md)).

- **Build** : l'étape de build du `Dockerfile` copie Go 1.24.5 depuis l'image `golang` épinglée par digest et
  reconstruit les assets Go (`pnpm --filter @typika/runtime-go build:assets`, environ 100 s). Hors Docker, le Go
  installé sur la machine doit être exactement la version épinglée.
- **Service** : `/runtime/assets/go/<clé>/` en `Cache-Control: public, max-age=31536000, immutable`. Chaque fichier
  a sa version `.br`, servie avec `Content-Encoding: br` quand le navigateur l'accepte (11,9 Mo au lieu de 79 Mo). Un
  proxy placé devant ne doit pas recompresser une réponse qui a déjà un `Content-Encoding` ; Caddy ne le fait pas.
- **Cache** : le navigateur garde les assets Go en Cache Storage sur le domaine runtime ; un rechargement ne les
  retélécharge pas.
- La version des assets est figée par la version de l'app : ne pas mélanger.

## 8. GitHub OAuth

1. Créer l'application OAuth (ou GitHub App, choix au M5 — [security.md](../specs/security.md) §3.5).
2. URL de callback : `<TYPIKA_PUBLIC_URL>/auth/github/callback`.
3. Renseigner `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET`.

## 9. Checklist après déploiement

- [ ] Les deux domaines répondent en HTTPS, certificats valides.
- [ ] Instance publique : le domaine runtime est un **site différent** de l'app (pas un sous-domaine).
- [ ] `curl -I <app>/play/strategy-ts` montre `Cross-Origin-Opener-Policy: same-origin` et
      `Cross-Origin-Embedder-Policy: require-corp`.
- [ ] Dans la sandbox, une erreur de type tapée dans l'éditeur est soulignée : le worker du language service démarre.
- [ ] `curl -I <app>/` montre `frame-ancestors 'none'` ; `curl -I <app>/embed/<template>` montre `frame-ancestors *`,
      sans COOP ni COEP.
- [ ] Dans la sandbox, la console de la runtime frame renvoie `self.crossOriginIsolated === true`.
- [ ] Une page de l'app demandée sur le domaine runtime n'est pas servie.
- [ ] Un template TS s'ouvre, ses tests passent.
- [ ] `/play/strategy-go` télécharge la toolchain Go en brotli (`Content-Encoding: br` sur `compile.wasm`), ses tests
      passent, et un rechargement ne la retélécharge pas.
- [ ] `/config.json` ne contient aucun secret.
- [ ] Avec Kotlin : un template Kotlin compile ; le scénario `rate` du test de charge (§4.5) passe ; une connexion
      sortante depuis le conteneur `kotlin-compiler` échoue.
- [ ] Sans Kotlin : aucun template Kotlin n'apparaît dans le hub.
- [ ] Avec GitHub : connexion, création de gist, puis déconnexion qui vide `sessionStorage`.
- [ ] La suite E2E de production passe contre l'instance :
      `TYPIKA_E2E_APP_URL=<app> TYPIKA_E2E_RUNTIME_URL=<runtime> pnpm --filter @typika/web test:e2e:production`.
