# Sécurité

Statut : spec · modèle de menaces V1

Typika exécute par conception du code qu'il n'a pas écrit : templates de tiers, liens partagés, code modifié par
l'utilisateur. La sécurité repose sur un principe : **le code exécuté ne partage jamais d'origine avec ce qui a de la
valeur** (token GitHub, projets locaux, session).

## 1. Actifs à protéger

| Actif | Où il vit |
|---|---|
| Token GitHub de l'utilisateur | Mémoire et `sessionStorage` de l'origine app |
| Projets locaux | IndexedDB de l'origine app |
| Intégrité des templates officiels | Registre `typika/registry`, repos `typika/*` |
| Disponibilité du service de compilation Kotlin | Conteneur `kotlin-compiler` |
| Réputation de l'instance | Domaine de l'instance (phishing, contenu hébergé) |
| Navigateur du visiteur | Ressources CPU / réseau consommées par le code exécuté |

## 2. Frontières

```
Origine app            : UI, IndexedDB, token GitHub. N'exécute jamais de code utilisateur.
Origine runtime        : workers, WASM, preview. Exécute le code utilisateur. Ne détient aucun secret.
Service web            : statique + POST /api/github/token. Ne stocke rien.
Service kotlin-compiler: compile du code non fiable. N'exécute pas le code compilé. Pas de réseau sortant.
```

### 2.1 Origine runtime dédiée

- `TYPIKA_RUNTIME_ORIGIN` doit être une origine différente de l'app. Deux niveaux :
  - **Instance ouverte au public** : un **site différent** (domaine enregistrable distinct, sur le modèle de
    `googleusercontent.com`). Un sous-domaine reste « same-site » : cookies `SameSite` et certaines protections ne le
    séparent pas de l'app.
  - **Instance privée** (usage personnel ou équipe, accès restreint) : un sous-domaine est toléré. Le stockage de l'app
    (IndexedDB, token GitHub) reste isolé par origine ; le risque résiduel porte sur les cookies same-site, que l'app
    n'utilise que pour l'état OAuth. L'app affiche un avertissement au démarrage dans cette configuration.
  - Origine runtime identique à celle de l'app : refusé au démarrage.
- L'app charge la runtime frame (`/runtime/frame.html`) dans une iframe :
  `<iframe sandbox="allow-scripts allow-same-origin" allow="cross-origin-isolated">`. `allow-same-origin` est sans
  danger ici puisque l'origine de la frame est différente de celle de l'app ; il est nécessaire au Service Worker et au
  cache d'assets.
- La preview d'un template est une iframe imbriquée dans la runtime frame, avec `sandbox="allow-scripts allow-forms
  allow-modals"`.
- La runtime frame ne reçoit **jamais** le token GitHub, ni le contenu d'autres projets que celui exécuté.

### 2.2 Canal app ↔ runtime

- Un `MessageChannel` est établi au chargement : un seul `postMessage` initial, avec `targetOrigin` explicite (jamais
  `*`). Côté frame, vérification de `event.origin` contre la liste autorisée.
- Tous les messages sont validés par Effect Schema des deux côtés ; un message invalide est ignoré et loggué.
- Le protocole n'expose que les opérations de `RuntimeSession` ([runtimes.md](./runtimes.md)). Aucune opération ne
  permet à la frame de lire l'état de l'app.

## 3. Menaces et mitigations

### 3.1 Code non fiable dans le navigateur

| Menace | Impact | Mitigation |
|---|---|---|
| Le code exécuté lit le token ou les projets | Vol de compte GitHub, fuite de code | Origine runtime séparée (§2.1) ; le token ne quitte pas l'origine app |
| Le code exfiltre des données ou attaque un tiers depuis le navigateur du visiteur (requêtes en masse, minage) | Abus attribué à l'instance, visiteur pénalisé | CSP de l'origine runtime : `connect-src` limité au CDN d'assets et à `'self'` ; pas d'accès réseau pour le code en V1 ; watchdog CPU ([runtimes.md](./runtimes.md) §4) |
| Boucle infinie, allocation massive | Onglet gelé | Exécution en worker, `terminate()` sur interruption, timeouts, plafond mémoire WASM |
| Navigation de la frame vers une page de phishing | Faux écran de connexion sur une origine Typika | Preview sans `allow-top-navigation` ; origine runtime sans aucune UI de connexion ni contenu de marque |
| Lien partagé qui exécute du code à l'ouverture | Exécution non voulue | Pas d'exécution automatique hors templates du registre (§3.4) |

### 3.2 Templates malveillants dans le registre

| Menace | Impact | Mitigation |
|---|---|---|
| Un template ajoute du code malveillant après acceptation | Code exécuté chez tous les visiteurs | Le registre épingle chaque template sur un **SHA de commit**, pas une branche ; toute mise à jour passe par une PR revue |
| Dépendance npm compromise (typosquatting, paquet piraté) | Exécution dans la sandbox et chez ceux qui font `typika create` | Lockfile obligatoire ; dépendances minimales (la revue refuse les dépendances non justifiées) ; Renovate avec délai de quarantaine sur les nouvelles versions |
| Scripts `postinstall` | Exécution à l'installation (CLI) | Aucun `npm install` dans la sandbox ([ADR 0017](../decisions/0017-node-runtime.md)) ; le CLI n'installe rien et n'exécute rien |
| CDN ESM compromis (`browser-js`) | Code injecté dans les dépendances | Versions épinglées ; assets propres à Typika avec SRI ; le risque résiduel du CDN pour les dépendances tierces est assumé et documenté |
| Tour Markdown contenant du HTML ou du JavaScript | XSS sur l'origine app | Markdown rendu **sans HTML brut**, sortie assainie, liens externes en `rel="noopener noreferrer"`, pas d'URL `javascript:` |
| Template de tiers trompeur (faux « officiel ») | Confiance abusée | Badge « officiel » réservé à `typika/*` ; les autres sont étiquetés « communauté » |
| CI de santé qui exécute un template malveillant | Vol de secrets CI | La CI de santé tourne dans un job sans secret, sans token d'écriture, dans un navigateur headless |

### 3.3 Service de compilation Kotlin

| Menace | Impact | Mitigation |
|---|---|---|
| Déni de service (requêtes en masse, compilations longues) | Service indisponible, VPS saturé | Rate limiting par IP au reverse proxy ; file à concurrence bornée ; timeout 15 s ; corps limité à 256 Kio ; `429` avec `Retry-After` |
| Code conçu pour exploiter le compilateur | Exécution dans le conteneur | Conteneur non-root, système de fichiers en lecture seule (sauf un `tmpfs` borné), `cap_drop: ALL`, `no-new-privileges`, CPU et mémoire plafonnés |
| Exfiltration ou rebond depuis le conteneur | Le VPS sert de relais d'attaque | **Aucun réseau sortant** : réseau Docker `internal`, seul le reverse proxy y accède |
| Exécution de code à la compilation (plugins, processeurs d'annotations) | Exécution arbitraire | Le service passe lui-même tous les arguments du compilateur : aucun plugin, aucun argument venu de la requête, bibliothèques figées dans l'image ([0019](../decisions/0019-kotlin-runtime.md)). Aucun endpoint n'exécute le code compilé |
| Fuite des sources dans les logs | Code privé exposé | Logs sans corps de requête : taille, durée, statut, hash |
| Abus d'un service exposé publiquement par des tiers | Coût pour l'instance | CORS limité à l'origine app ; le rate limiting s'applique quand même (CORS ne protège pas contre les clients hors navigateur) |

### 3.4 Partage par URL et gist

| Menace | Impact | Mitigation |
|---|---|---|
| Lien piégé avec du code malveillant | Exécution non voulue | Un projet ouvert depuis un lien ou un gist n'est **jamais exécuté automatiquement** : bandeau « code provenant d'un lien », bouton « Exécuter » explicite |
| Bombe de décompression dans le fragment | Onglet gelé | Taille max du fragment et taille max décompressée (limites projet de [runtimes.md](./runtimes.md) §8), décompression en streaming interrompue au dépassement |
| Contenu qui viole les limites ou le schéma | Crash, état incohérent | Validation Effect Schema avant toute écriture en IndexedDB |
| Lien qui se fait passer pour un template officiel | Confiance abusée | Un projet partagé est affiché comme tel, jamais avec le badge du template d'origine |

Le fragment (`#…`) n'est jamais envoyé au serveur : l'instance ne voit pas le code partagé.

### 3.5 OAuth GitHub

| Menace | Impact | Mitigation |
|---|---|---|
| Scopes excessifs | Token trop puissant en cas de fuite | Scopes demandés au moment du besoin : `gist` pour partager, `public_repo` pour exporter ; jamais `repo` ni accès organisation |
| CSRF sur le callback | Liaison au compte de l'attaquant | Paramètre `state` aléatoire, vérifié au callback ; PKCE si GitHub le supporte pour le type d'app retenu |
| Abus de `POST /api/github/token` | Endpoint utilisé par des tiers | Vérification de l'en-tête `Origin` ; CORS limité à l'origine app ; rate limiting |
| Token stocké côté serveur | Fuite massive | L'endpoint échange `code` → token et le renvoie ; aucun stockage, aucun log du token ni du `code` |
| Vol du token côté client | Accès au compte | Mémoire + `sessionStorage` (disparaît à la fermeture de l'onglet), jamais `localStorage` ; CSP stricte sur l'origine app ; lien de révocation dans l'UI |

Choix entre OAuth App et GitHub App (granularité des permissions, PKCE) : à trancher au M5, avec une préférence pour
la permission la plus fine disponible.

### 3.6 Embed

| Menace | Impact | Mitigation |
|---|---|---|
| Clickjacking sur l'app | Action involontaire (publication, gist) | `frame-ancestors 'none'` sur toutes les routes sauf `/embed/*` |
| Clickjacking sur l'embed | Action involontaire dans l'embed | L'embed n'a aucune action sensible : pas de connexion GitHub, pas de gist, pas d'export ; « Ouvrir dans Typika » ouvre un nouvel onglet |
| Le site hôte pilote l'embed par `postMessage` | Injection d'état | API hôte limitée à des options d'affichage (thème, fichier, étape de tour), validées par schema ; aucune lecture d'état de l'utilisateur |
| L'embed lit l'état de l'utilisateur | Fuite de projets | En contexte tiers, le stockage est partitionné par le navigateur ; l'embed n'utilise que le template public demandé |

Une iframe dans une page tierce non isolée ne peut pas être isolée ([0016](../decisions/0016-isolation-and-embed.md)).
L'embed exécute `browser-js` et `go` ([0018](../decisions/0018-go-runtime.md)), qui n'utilisent pas
`SharedArrayBuffer` ; un runtime qui en a besoin n'y démarre pas, et l'embed affiche « Ouvrir dans Typika ».

## 4. En-têtes

| En-tête | Origine app | Origine app `/embed/*` | Origine runtime |
|---|---|---|---|
| `Content-Security-Policy` | stricte (ci-dessous) | stricte + `frame-ancestors *` | permissive pour les scripts, `connect-src` fermé (ci-dessous) |
| `Cross-Origin-Opener-Policy` | `same-origin` sur les routes isolées ([architecture.md](./architecture.md) §5) | — (sans effet dans une iframe) | `same-origin` |
| `Cross-Origin-Embedder-Policy` | `require-corp` sur les routes isolées | — (aucune isolation possible dans une page tierce) | `require-corp`, y compris scripts de worker et `.wasm` |
| `Cross-Origin-Resource-Policy` | `same-origin` | `same-origin` | `cross-origin` (chargée en iframe par l'app) |
| `X-Content-Type-Options` | `nosniff` | `nosniff` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` | `no-referrer` |
| `Strict-Transport-Security` | `max-age=31536000` | idem | idem |

COEP vaut `require-corp`, pas `credentialless` : WebKit ignore `credentialless` et n'isole alors jamais la page
([0016](../decisions/0016-isolation-and-embed.md)). Sans CORP `cross-origin` sur l'origine runtime, la runtime frame
est bloquée par la COEP de l'app ; sans `allow="cross-origin-isolated"` sur l'iframe, Chromium ne l'isole pas.

CSP de l'origine app (base, à affiner au M1) :

```
default-src 'self';
script-src 'self' <TYPIKA_ASSETS_BASE_URL>;
worker-src 'self' blob:;
connect-src 'self' https://api.github.com <TYPIKA_REGISTRY_INDEX_URL> <KOTLIN_COMPILER_URL> <TYPIKA_ASSETS_BASE_URL>;
frame-src <TYPIKA_RUNTIME_ORIGIN>;
img-src 'self' data: https:;
style-src 'self' 'unsafe-inline';
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

Pas de `'wasm-unsafe-eval'` : le language service TypeScript et le parseur Lezer sont en JavaScript
([0015](../decisions/0015-editor.md)). Le WASM ne tourne que sur l'origine runtime.

CSP de l'origine runtime :

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob: <TYPIKA_ASSETS_BASE_URL> <CDN ESM>;
worker-src 'self' blob:;
connect-src 'self' <TYPIKA_ASSETS_BASE_URL> <CDN ESM>;
frame-src 'self' blob:;
object-src 'none';
base-uri 'none';
frame-ancestors *;
```

`<CDN ESM>` est l'origine de `TYPIKA_PACKAGE_URL_TEMPLATE` ; par défaut jsDelivr, la même que les assets.
`'unsafe-eval'` sert aussi au harness de `browser-js`, qui importe le bundle par un `import()` construit dynamiquement.

`frame-ancestors *` est nécessaire parce que la directive vérifie **toute** la chaîne d'ancêtres : dans un embed, la page
du site hôte est un ancêtre de la runtime frame. La protection de la frame repose donc sur la vérification d'origine du
canal (§2.2), pas sur `frame-ancestors`.

## 5. Chaîne d'approvisionnement de Typika

- Lockfile obligatoire, `pnpm install --frozen-lockfile` en CI.
- Renovate, avec délai avant adoption des nouvelles versions.
- Assets publiés (WASM, test runner) versionnés et accompagnés de leur hash SRI.
- Paquets npm (`cli`, `test-runner`) publiés depuis la CI avec provenance.
- Image Docker construite en CI depuis le dépôt, avec une image de base épinglée par digest.

## 6. Signalement

Un `SECURITY.md` à la racine indique comment signaler une vulnérabilité en privé (GitHub Security Advisories). Il est
créé au M1.
