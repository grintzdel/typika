# 0031 — Runtimes en embed : les trois, dans un contexte sécurisé

**Statut** : Acceptée · 2026-10-19 · lot 4 du M5 · complète [0016](0016-isolation-and-embed.md),
[0018](0018-go-runtime.md) et [0019](0019-kotlin-runtime.md)

## Contexte

L'embed `/embed/<name>` s'affiche dans la page d'un site tiers, sans isolation cross-origin
([0016](0016-isolation-and-embed.md)). 0018 et 0019 autorisent Go et Kotlin en embed, puisqu'aucun des deux n'utilise
`SharedArrayBuffer`. Mais aucun spike n'avait fait tourner ces runtimes dans la vraie chaîne : page hôte, puis page de
l'app sans COOP ni COEP, puis runtime frame. Le lot 4 doit trancher avant de construire l'embed. Restent deux
questions ouvertes : ce que coûtent les 12 Mo d'assets Go dans une page de blog, et ce que deviennent les compilations
Kotlin quand le trafic vient de sites tiers.

Un spike a monté cette chaîne sur le build de production : app sur `localhost:3100`, runtime sur `127.0.0.1:3100`,
service Kotlin et registre de test. Chaque page hôte est un site distinct, `blog.localhost` ou `other.localhost`.
Faute de route `/embed`, la page `/play/<name>` est servie dans l'iframe sans COOP ni COEP, avec
`frame-ancestors *`. Le spike a tourné dans le Chromium et le WebKit de Playwright.

Résultats, identiques dans les deux moteurs sauf mention contraire :

- **Les trois runtimes tournent.** `crossOriginIsolated` est faux dans les trois frames. Les 12 tests de
  `strategy-go` et les 11 de `strategy-kotlin` passent.
- **Go garde ses assets par site hôte.** Le premier run télécharge les trois assets, 79,3 Mo bruts, et les range dans
  le Cache Storage de la runtime frame. Un rechargement sur le même hôte ne télécharge plus rien. Sur un autre site
  hôte, les trois assets sont téléchargés de nouveau, parce que le navigateur partitionne le stockage par site de
  premier niveau.
- **Kotlin tourne sans compiler tant que rien n'est modifié.** Les tests de `strategy-kotlin` passent sur l'artefact
  précompilé, en 85 à 108 ms, sans aucun appel au relais. Après une modification, un appel à
  `/api/kotlin/compile` répond `200`, et les tests repassent en 1,9 à 2,4 s. La requête part de la page de l'app :
  son `Origin` est celui de l'app, et le relais l'accepte ([0029](0029-kotlin-relay-rate-limit.md)).
- **Une page hôte en `http` casse tout en silence.** Un contexte n'est sécurisé que si tous ses ancêtres le sont.
  Sous un hôte `http`, l'app et la runtime frame perdent `caches` et `crypto.subtle`, dont dépend le chargeur Go
  ([0027](0027-go-assets-delivery.md)). Go ne démarre pas, et ses boutons restent sur « Chargement du runtime… ».
  `browser-js` et Kotlin se disent prêts, mais leurs tests ne rendent jamais de résultat. Aucune erreur n'est
  affichée.
- **Artefact du banc local** : sous un hôte tiers, Chromium refuse à l'app l'accès au registre servi sur une adresse
  loopback (« Local Network Access »). Ce n'est pas le cas en production, où le registre est public. Le spike a
  désactivé ce contrôle.

## Décision

- **L'embed exécute les trois runtimes de la V1** : `browser-js`, `go` et `kotlin`. La règle de 0016 ne change pas :
  un runtime qui exigerait l'isolation n'y démarrerait pas, mais aucun runtime de la V1 n'est dans ce cas.
- **L'embed exige un contexte sécurisé.** Au démarrage, il vérifie `isSecureContext`. S'il est faux, aucun runtime ne
  démarre : le code reste lisible, et la barre propose « Ouvrir dans Typika », avec la raison (la page hôte n'est pas
  servie en HTTPS). Cette règle vaut pour tous les runtimes, puisque tous échouent sans rien afficher.
- **Go ne démarre qu'au clic.** `run=auto` est ignoré pour un template Go. Démarrer tout seul téléchargerait 12 Mo à
  chaque visiteur d'une page de blog qui contient l'embed, avant même qu'il le voie. Le premier clic affiche la barre
  de progression du runtime, comme dans la sandbox.
- **Kotlin passe par le relais existant.** Rien n'est ajouté pour l'embed : même `Origin`, même limite par IP. Le
  cache des compilations reste en mémoire pendant la session, puisque l'embed n'a aucune persistance locale.

## Conséquences

- Un template Go embarqué coûte 11,9 Mo en brotli au premier run, une fois par site hôte et par version des assets.
  Chaque site hôte stocke ensuite 79 Mo dans son Cache Storage. Dans ce contexte, le WebKit de Playwright annonce un
  quota de 2 Gio, alors que [0027](0027-go-assets-delivery.md) en relevait environ 100 Mio pour la frame. Le quota de
  Safari réel reste à mesurer, comme pour 0016.
- Un embed Kotlin non modifié ne sollicite jamais le service. Les modifications d'un lecteur comptent dans sa limite
  par IP, comme dans l'app.
- Une page hôte en `http` affiche « Ouvrir dans Typika » au lieu de Run et Tests. Les blogs servis en HTTPS ne sont
  pas concernés.
- Les E2E du lot 4 servent la page hôte sur un site `*.localhost` : un hôte en `http` sur un autre nom ferait perdre
  le contexte sécurisé. Sur le build de production, Chromium tourne sans le contrôle « Local Network Access », pour
  joindre le registre de test. Un cas vérifie qu'un hôte non sécurisé affiche le repli.
- [security §3.6](../specs/security.md) et [ui §13](../specs/ui.md) reprennent ces règles.

## Alternatives écartées

- **Embed limité à `browser-js`** : Go et Kotlin tournent, mesures à l'appui. Les renvoyer vers l'app retirerait la
  moitié du catalogue de l'embed, sans rien gagner en sécurité.
- **Kotlin en lecture seule dans l'embed** : cela éviterait toute compilation venue de sites tiers. Mais la limite
  par IP du relais traite déjà ce trafic comme celui de l'app, et un embed où l'on ne peut rien modifier perd son
  intérêt.
- **`run=auto` permis pour Go** : 12 Mo téléchargés à l'ouverture de la page, pour des lecteurs qui ne cliqueront pas
  forcément.
- **Laisser échouer en `http`** : le lecteur verrait un runtime bloqué ou des tests qui ne finissent jamais, sans
  explication.
