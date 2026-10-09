# Héberger Typika

Statut : guide · les fichiers de configuration ci-dessous sont des **exemples de référence**. Ils seront créés au M1
(`Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`, `vercel.ts`) et ce guide sera alors aligné sur eux.

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
| `TYPIKA_REGISTRY_INDEX_URL` | non | oui | `https://…/index.json` | Index du registre ; défaut : registre officiel |
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
pnpm turbo run build --filter=web
```

Le prérendu du hub lit l'index du registre **au build**. Pour que les pages du hub suivent le registre :

- reconstruire l'image à chaque publication de l'index (webhook du registre ou build planifié) ;
- en attendant, le hub recharge l'index côté client : santé et nouveaux templates apparaissent, seules les pages
  prérendues sont en retard.

## 4. Docker (cible principale)

### 4.1 Dockerfile — description

Multi-stage, image de base Node 24 épinglée par digest :

1. **`deps`** : active pnpm via Corepack, `pnpm fetch` sur le lockfile (couche mise en cache tant que le lockfile ne
   change pas).
2. **`build`** : copie les sources, `pnpm install --offline --frozen-lockfile`, `pnpm turbo run build --filter=web`.
3. **`runtime`** : image Node minimale, copie uniquement la sortie du preset serveur de TanStack Start (le dossier exact
   dépend du preset, fixé au M1), utilisateur non-root, `EXPOSE 3000`, `HEALTHCHECK` sur `GET /`.

Le service `kotlin-compiler` a sa propre image (`services/kotlin-compiler/Dockerfile`) : un JRE, le service de
compilation et ses bibliothèques Kotlin ([runtimes.md](../specs/runtimes.md) §6.4). Environ 630 Mo.

### 4.2 docker-compose.yml — exemple

```yaml
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ['80:80', '443:443']
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    environment:
      TYPIKA_APP_DOMAIN: typika.example.org
      TYPIKA_RUNTIME_DOMAIN: typika-run.example.net
    networks: [public, compiler]
    depends_on: [web]

  web:
    image: ghcr.io/<owner>/typika-web:<version>
    restart: unless-stopped
    env_file: .env
    expose: ['3000']
    read_only: true
    user: '1000:1000'
    networks: [public]

  kotlin-compiler:
    image: ghcr.io/<owner>/typika-kotlin-compiler:<version>
    profiles: [kotlin]
    restart: unless-stopped
    expose: ['8080']
    read_only: true
    tmpfs: ['/tmp:size=256m']
    cap_drop: [ALL]
    security_opt: ['no-new-privileges:true']
    mem_limit: 1g
    cpus: 2
    environment:
      KOTLIN_COMPILER_CONCURRENCY: '2'
    networks: [compiler]

networks:
  public: {}
  compiler:
    internal: true

volumes:
  caddy_data: {}
  caddy_config: {}
```

- Le service Kotlin est dans un **profil** : `docker compose --profile kotlin up -d` l'active, `docker compose up -d`
  sans profil l'omet. Dans ce cas, ne pas définir `KOTLIN_COMPILER_URL`.
- Le réseau `compiler` est `internal` : le conteneur n'a pas d'accès sortant ; seul Caddy le joint.
- `mem_limit` et `cpus` : 1 Gio et 2 vCPU suffisent pour 2 compilations simultanées, environ 1 s chacune à chaud ;
  4 vCPU et 2 Gio doublent le débit ([0019](../decisions/0019-kotlin-runtime.md)).

### 4.3 Caddyfile — exemple

```caddyfile
{$TYPIKA_APP_DOMAIN} {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		Cross-Origin-Resource-Policy "same-origin"
		-Server
	}

	@isolated path /play* /compare* /s /s/*
	header @isolated {
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Embedder-Policy "require-corp"
	}

	@embed path /embed/*
	header @embed Content-Security-Policy "<CSP app> ; frame-ancestors *"

	@notEmbed not path /embed/*
	header @notEmbed Content-Security-Policy "<CSP app> ; frame-ancestors 'none'"

	handle_path /api/kotlin/* {
		request_body {
			max_size 256KB
		}
		reverse_proxy kotlin-compiler:8080
	}

	reverse_proxy web:3000
}

{$TYPIKA_RUNTIME_DOMAIN} {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "no-referrer"
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Embedder-Policy "require-corp"
		Cross-Origin-Resource-Policy "cross-origin"
		Content-Security-Policy "<CSP runtime>"
		-Server
	}

	rewrite * /runtime{uri}
	reverse_proxy web:3000
}
```

- `<CSP app>` et `<CSP runtime>` : valeurs de [security.md](../specs/security.md) §4, avec les URL de l'instance.
- Si `/api/kotlin/*` est servi par le même domaine que l'app, `KOTLIN_COMPILER_URL=/api/kotlin` et le CORS est inutile.
- **Rate limiting** : Caddy n'en fournit pas en standard. Options à valider au M6 : module tiers (build Caddy
  personnalisé avec `xcaddy`), ou limitation dans l'adaptateur du service Kotlin et dans le handler
  `/api/github/token`. Le service ne doit pas être exposé sans l'une des deux.
- Le `rewrite` du domaine runtime suppose que le service `web` sert la runtime frame sous `/runtime/`. Le service `web`
  doit refuser les routes de l'app sur l'hôte runtime (et inversement), pour qu'aucune page de l'app ne soit servie
  sur l'origine runtime.

### 4.4 Démarrage

```sh
cp .env.example .env            # renseigner les variables du §2
docker compose up -d            # sans Kotlin
docker compose --profile kotlin up -d   # avec Kotlin
```

## 5. Vercel

- Projet Vercel sur `apps/web`, deux domaines rattachés : celui de l'app et celui du runtime.
- Les en-têtes sont déclarés dans `vercel.ts` avec des règles par hôte (`has: [{ type: 'host', value: … }]`) et par
  chemin, avec les mêmes valeurs que le Caddyfile. Syntaxe exacte à vérifier contre `@vercel/config` au M1.
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
- [ ] `curl -I <app>/play/new` montre `Cross-Origin-Opener-Policy: same-origin` et
      `Cross-Origin-Embedder-Policy: require-corp`.
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
- [ ] La suite E2E d'en-têtes passe contre l'URL déployée : `pnpm --filter web test:e2e:headers --base-url <app>`.
