# 0027 — Assets Go : servis par l'image, gardés en Cache Storage

**Statut** : Acceptée · 2026-10-12 · lot 2 du M4 · traite R3 pour le runtime `go`

## Contexte

Le runtime `go` charge `compile.wasm`, `link.wasm` et `std.pack` : 79 Mo bruts, 11,9 Mo en brotli
([0018](0018-go-runtime.md)). [runtimes §5](../specs/runtimes.md) prévoyait des assets servis depuis
`TYPIKA_ASSETS_BASE_URL` (un CDN par défaut) et mis en cache par un Service Worker sur l'origine runtime. Au lot 2, il
faut que l'app les serve, qu'un rechargement ne les retélécharge pas, et qu'une barre montre le premier
téléchargement.

## Décision

- **L'image Docker construit et sert les assets.** L'étape de build copie Go 1.24.5 depuis l'image `golang` épinglée
  par digest, puis lance `pnpm --filter @typika/runtime-go build:assets`. Le build de la runtime frame copie les
  fichiers sous `/runtime/assets/go/<clé>/`, où `<clé>` est le début de la clé du manifeste d'assets. L'URL change
  quand les assets changent : le serveur les sert en `immutable`.
- **Brotli précompressé.** `build:assets` écrit un `.br` à côté de chaque fichier. Le serveur Node le sert avec
  `Content-Encoding: br` quand la requête l'accepte, et le fichier brut sinon. Caddy ne compresse qu'en zstd et
  gzip, et ne recompresse pas une réponse qui a déjà son encodage.
- **Cache Storage, sans Service Worker.** Le chargeur du runtime, dans la frame, lit chaque asset dans le cache
  `typika-go-<clé>` et ne le télécharge qu'en son absence. Il supprime les caches `typika-go-*` des autres clés.
- **SHA-256 vérifié après le téléchargement.** Le manifeste embarqué dans la frame donne la taille et le SHA-256 de
  chaque fichier. Le chargeur vérifie le hash avant de mettre l'asset en cache. On n'utilise pas l'option
  `integrity` de `fetch` : le navigateur lit alors tout le corps avant de rendre la réponse, et la barre de
  progression resterait vide.
- **Progression** : `load` émet la taille brute de chaque asset dès le départ, puis les octets reçus. L'app les
  additionne et affiche la barre pendant le démarrage du runtime.

## Conséquences

- Pas de `TYPIKA_ASSETS_BASE_URL` pour l'instant : une instance sert ses propres assets. Le runtime reçoit une URL de
  base, et un CDN pourra la fournir plus tard sans toucher au chargeur.
- L'image grossit d'environ 92 Mo (fichiers bruts et `.br`). Son build demande Go et prend environ 100 s de plus,
  surtout pour la compression brotli.
- WebKit donne environ 100 Mio de Cache Storage à la frame, qui est un contexte tiers. Les assets Go en prennent 79 Mo.
  Un deuxième runtime lourd devra stocker ses assets compressés ou partager ce quota autrement.
- Un contexte éphémère de WebKit (celui de Playwright par défaut) vide le Cache Storage au rechargement. L'E2E qui
  vérifie le cache tourne donc dans un profil persistant, comme un vrai navigateur.
- `esbuild.wasm` reste sur le cache HTTP : son URL est hachée par Vite et il ne pèse que 2,6 Mo en brotli.

## Alternatives écartées

- **Service Worker** : il ajoute un cycle de vie (le premier chargement n'est pas contrôlé, la mise à jour et
  `clients.claim` sont à gérer) et un script à servir et à tester. Tout cela pour faire du cache-first sur des URL qui
  ne changent jamais, ce que Cache Storage fait directement depuis la frame. Le Service Worker reste prévu pour la
  preview de `browser-js` ([runtimes §6.1](../specs/runtimes.md)).
- **CDN dès maintenant** : il faudrait publier une archive d'assets par version et la garder alignée sur l'app,
  alors qu'aucune instance publique n'existe encore.
- **Cache HTTP seul** : les navigateurs évincent tôt les gros fichiers, et un rechargement forcé l'ignore.
- **Compression à la volée par Caddy** : 17,6 Mo en gzip et 16,4 Mo en zstd (niveaux par défaut), au-dessus du
  critère de 12 Mo, et chaque requête recompresse 79 Mo.
