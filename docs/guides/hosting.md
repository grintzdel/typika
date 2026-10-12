# Héberger Typika

Statut : guide · aligné sur les fichiers du dépôt (`Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`,
`.env.example`) depuis le M1. Vercel (§5) et le service Kotlin restent à faire.

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
| `TYPIKA_REGISTRY_INDEX_URL` | non | oui | `https://…/index.json` | Index du registre ; défaut : `/registry/index.json`, servi par l'app jusqu'au lot 7 du M3 |
| `TYPIKA_TEMPLATE_FILE_URL_TEMPLATE` | non | oui | `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}` | Fichier d'un template à sa ref épinglée ([0022](../decisions/0022-template-files-source.md)) ; défaut : le miroir de l'app |
| `TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE` | non | oui | `https://data.jsdelivr.com/v1/packages/gh/{owner}/{repo}@{ref}?structure=flat` | Liste des fichiers d'un dépôt à un commit, au format de jsDelivr ; défaut : le miroir de l'app |
| `TYPIKA_ASSETS_BASE_URL` | non | oui | `https://cdn.jsdelivr.net/npm/@typika/runtime-assets@1.0.0/` | Base des assets de runtime ; défaut : CDN public |
| `TYPIKA_PACKAGE_URL_TEMPLATE` | non | oui | `https://esm.sh/{name}@{version}{path}` | CDN ESM des dépendances npm des templates `browser-js` ; défaut : jsDelivr ([runtimes](../specs/runtimes.md) §6.1) |
| `TYPIKA_EMBED_ENABLED` | non | oui | `true` | Active `/embed/*` |
| `KOTLIN_COMPILER_URL` | non | oui | `/api/kotlin` ou `https://kotlin.example.org` | Service de compilation ; absent ⇒ Kotlin désactivé |
| `GITHUB_CLIENT_ID` | non | oui | `Iv1.…` | Application OAuth ; absent ⇒ fonctions GitHub désactivées |
| `GITHUB_CLIENT_SECRET` | si `GITHUB_CLIENT_ID` | **non** | — | Échange `code` → token, jamais exposé au client |
| `PORT` | non | non | `3000` | Port d'écoute du service `web` |
| `NODE_ENV` | non | non | `production` | — |

Variables du service `kotlin-compiler` :

| Variable | Défaut | Rôle |
|---|---|---|
| `KOTLIN_COMPILER_ALLOWED_ORIGIN` | — | Origine autorisée en CORS (l'app) ; inutile si le service est derrière le même domaine |
| `KOTLIN_COMPILER_MAX_BODY_KB` | `256` | Taille max des sources |
| `KOTLIN_COMPILER_TIMEOUT_MS` | `15000` | Timeout de compilation |
| `KOTLIN_COMPILER_CONCURRENCY` | `2` | Compilations simultanées ; les suivantes attendent |
| `KOTLIN_COMPILER_QUEUE_MAX` | `20` | Au-delà, réponse `503` |
| `KOTLIN_COMPILER_CACHE_MB` | `128` | Cache mémoire des artefacts (`0` pour désactiver) |

Valeurs alignées sur [runtimes.md](../specs/runtimes.md) §8. Dimensionnement mesuré au spike R8
([0019](../decisions/0019-kotlin-runtime.md)) : 2 compilations simultanées tiennent dans 1 Gio (pic à 656 Mio) ; en
dessous, le ramasse-miettes s'effondre.

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

Le service Kotlin s'ajoutera au M6 dans un profil `kotlin`, sur un réseau interne sans accès sortant, avec
`/api/kotlin/*` routé par Caddy et un rate limiting à choisir à ce moment-là (module Caddy tiers ou limitation dans le
service).

### 4.4 Démarrage

```sh
cp .env.example .env            # renseigner les variables du §2 et les deux domaines
docker compose up -d --build
```

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
  déployer sur un VPS ou un service de conteneurs managé, puis renseigner `KOTLIN_COMPILER_URL` (URL absolue) et
  `KOTLIN_COMPILER_ALLOWED_ORIGIN`.
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

Les assets de runtime (WASM d'esbuild, runtime Go, harness de test, test runner) sont publiés par version, avec un
manifeste d'assets qui liste chaque fichier et son hash SRI.

- **Par défaut** : CDN public (jsDelivr). Le CDN doit servir `Cross-Origin-Resource-Policy: cross-origin` ou des
  en-têtes CORS compatibles avec COEP ; jsDelivr envoie les deux (vérifié le 2026-10-09).
- **Auto-hébergé** : télécharger l'archive d'assets de la version de l'app, la servir sous un chemin (par exemple
  `/assets/runtime/<version>/` sur le domaine runtime) et pointer `TYPIKA_ASSETS_BASE_URL` dessus. En-têtes requis :
  `Cache-Control: public, max-age=31536000, immutable`, `Cross-Origin-Resource-Policy: cross-origin`,
  `Access-Control-Allow-Origin: *`.
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
- [ ] Un template TS s'ouvre, ses tests passent ; le premier chargement télécharge les assets depuis
      `TYPIKA_ASSETS_BASE_URL`, le second vient du cache.
- [ ] `/config.json` ne contient aucun secret.
- [ ] Avec Kotlin : un template Kotlin compile ; une rafale de requêtes reçoit des `429` ; une connexion sortante
      depuis le conteneur `kotlin-compiler` échoue.
- [ ] Sans Kotlin : aucun template Kotlin n'apparaît dans le hub.
- [ ] Avec GitHub : connexion, création de gist, puis déconnexion qui vide `sessionStorage`.
- [ ] La suite E2E de production passe contre l'instance :
      `TYPIKA_E2E_APP_URL=<app> TYPIKA_E2E_RUNTIME_URL=<runtime> pnpm --filter @typika/web test:e2e:production`.
