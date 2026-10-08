# Spikes (M0)

Un spike répond à une question précise par un prototype jetable, dans un temps borné. Il produit une conclusion écrite
(go / no-go / plan B) et, si une décision est prise, un ADR dans [decisions](decisions/README.md). Le code des spikes
ne rejoint pas le monorepo.

Jeu d'essai commun : le template **Strategy** rédigé au M0 (une dizaine de fichiers, des tests), décliné dans le
langage du spike.

| # | Question | Bloque |
|---|---|---|
| R1 | Peut-on utiliser WebContainers ? Sinon, que couvre `browser-js` seul ? | Runtime `node` |
| R2 | L'embed fonctionne-t-il sur un site tiers avec COOP/COEP ? | Embed (M5), architecture des origines |
| R4 | L'IntelliSense TS dans CodeMirror 6 est-il assez bon ? | Choix de l'éditeur |
| R7 | Comment exécuter Go dans le navigateur ? | Runtime `go` (M4) |
| R8 | Le service de compilation Kotlin est-il viable ? | Runtime `kotlin` (M6) |
| R6 | « Typika » est-il libre côté marques ? | Toute communication |

R3 (poids des runtimes), R5 (pourrissement) et R9 (abus du service de compilation) ne sont pas des spikes : ils sont
traités dans les jalons concernés ([roadmap](roadmap.md)).

---

## R1 — WebContainers

**Question** : les conditions de licence de l'API WebContainers autorisent-elles un projet open source, gratuit, auto-
hébergeable par des tiers ? Si non, de quoi a-t-on réellement besoin d'un runtime Node ?

À faire :

1. Lire les conditions de licence actuelles et, si elles sont ambiguës, contacter l'éditeur. Noter précisément le cas
   « instance auto-hébergée par un tiers ».
2. Lister les templates du [catalogue](specs/catalogue.md) qui ont besoin de Node (serveur HTTP, `npm install` de
   paquets natifs, Vite complet). Hypothèse : presque aucun.
3. Évaluer les alternatives : Nodebox (conditions de licence à lire aussi), ou extension de `browser-js` avec un
   résolveur de paquets npm via CDN ESM.

Critères :

- **Go** : licence compatible, y compris pour les instances tierces.
- **Plan B** : `browser-js` + résolution npm via CDN couvre tout le catalogue ; le runtime `node` est reporté.
- **No-go** : aucune option ne couvre les templates qui en ont besoin → on les retire du catalogue V1.

Sortie : ADR « Runtime Node ».

**Conclusion (2026-10-08) : Plan B.** WebContainers exige une licence pour tout usage en production qui sert des
clients ou des employés, et dépend des serveurs de StackBlitz. Nodebox est sous une licence non OSI, réservée aux
usages non commerciaux. Aucun template du catalogue n'a besoin de Node : `browser-js` couvre les 19 variantes TS et JS.
Le runtime `node` sort de la V1 et du schéma 1. Voir [0017](decisions/0017-node-runtime.md).

## R2 — Embed sous COOP/COEP

**Question** : un template embarqué en iframe sur un domaine tiers peut-il exécuter son runtime, sachant que
`SharedArrayBuffer` exige l'isolation cross-origin ?

À faire :

1. Page hôte sur un domaine tiers, sans headers particuliers, qui embarque `/embed/<name>`.
2. Mesurer `crossOriginIsolated` dans l'iframe pour chaque combinaison : `COEP: require-corp` vs `credentialless`,
   attribut `allow="cross-origin-isolated"` sur l'iframe.
3. Vérifier quels runtimes ont réellement besoin de `SharedArrayBuffer` (esbuild-wasm en worker en a-t-il besoin ?).
4. Tester Chrome, Firefox, Safari.

Critères :

- **Go** : l'embed exécute `browser-js` dans les trois navigateurs sans exiger de headers de la page hôte.
- **Plan B** : l'embed n'exécute que les runtimes sans `SharedArrayBuffer` ; les autres proposent « Ouvrir dans
  Typika ».

Sortie : ADR « Isolation et embed », mise à jour de [security](specs/security.md) et [hosting](guides/hosting.md).

**Conclusion (2026-10-08) : Go pour `browser-js`, Plan B pour les runtimes à `SharedArrayBuffer`.** Aucune isolation
n'est possible dans une page tierce, mais `browser-js` n'en a pas besoin : bundle, tests et kill dur fonctionnent sur
Chromium et WebKit. L'embed ne pose plus ni COOP ni COEP ; COEP `require-corp` partout ailleurs. Firefox et Safari
réel restent à vérifier à la main. Voir [0016](decisions/0016-isolation-and-embed.md).

## R4 — TypeScript dans CodeMirror 6

**Question** : peut-on offrir complétion, diagnostics et survol de types de qualité suffisante dans CodeMirror 6 ?

À faire :

1. Language service TypeScript dans un worker, branché sur CodeMirror 6 (intégrations communautaires existantes à
   évaluer).
2. Template de 20 fichiers avec imports croisés.
3. Mesurer : temps de démarrage, latence de complétion, poids téléchargé, comportement mobile.
4. Comparer avec Monaco sur les mêmes mesures.

Critères :

- **Go** : complétion < 200 ms après démarrage, diagnostics multi-fichiers corrects, poids raisonnable pour l'embed.
- **No-go** : on bascule sur Monaco, en acceptant un embed plus lourd.

Sortie : ADR « Éditeur » (confirme ou remplace [0008](decisions/0008-codemirror-6.md)).

**Conclusion (2026-10-08) : Go.** Complétion médiane à 31 ms sur desktop (Monaco : 130 ms), diagnostics
multi-fichiers corrects, 140 Kio pour l'éditeur seul. Adaptateur TypeScript maison au M1. Voir
[0015](decisions/0015-editor.md).

## R7 — Go dans le navigateur

**Question** : interpréteur ou compilateur ?

| Option | À mesurer |
|---|---|
| Yaegi (interpréteur Go écrit en Go) compilé en WASM | Couverture du langage utilisé par le catalogue (interfaces, génériques, goroutines, `testing`), poids, vitesse |
| Toolchain Go complète compilée en WASM | Poids, temps de première compilation, faisabilité de `go test` |

À faire : faire tourner la variante Go de Strategy et ses tests avec chaque option ; produire une sortie compatible
`go test -json` pour le mapping vers les événements de test ([runtimes](specs/runtimes.md)).

Critères :

- **Go** : les variantes Go du catalogue s'exécutent avec leurs tests, chargement initial acceptable avec indicateur.
- **Plan B** : restreindre le sous-ensemble de Go utilisé par les templates aux capacités de l'option retenue, et le
  documenter dans le [guide d'écriture](guides/template-authoring.md).

Sortie : ADR « Runtime Go ».

**Conclusion (2026-10-08) : Go, option B.** La toolchain Go officielle compilée en WASM reproduit `go test` à
l'identique, sans `SharedArrayBuffer`, donc aussi en embed : build de test en 250 à 300 ms sur desktop (Chromium,
WebKit), 1,2 s à CPU ×4, pour 11,7 Mo en brotli au premier chargement. Yaegi est écarté : quatre défauts sur
`strategy-go`, dont une sortie fausse sans erreur. Firefox reste à vérifier à la main. Voir
[0018](decisions/0018-go-runtime.md).

## R8 — Service de compilation Kotlin

**Question** : `kotlin-compiler-server` peut-il servir de service de compilation sans état, vers JS ou Wasm, à un
coût acceptable sur un VPS ?

À faire :

1. Confirmer la licence du projet.
2. Le déployer en conteneur ; compiler la variante Kotlin de Strategy vers Kotlin/JS et Kotlin/Wasm.
3. Exécuter le résultat et les tests `kotlin.test` dans le navigateur.
4. Mesurer : RAM du conteneur, latence de compilation à froid et à chaud, débit sous charge.
5. En parallèle, tester `kotlinc` dans le navigateur via une JVM WASM (CheerpJ) : poids, temps, licence.

Critères :

- **Go** : compilation < 3 s à chaud, empreinte compatible avec le VPS, licence compatible.
- **Alternative** : `kotlinc` dans le navigateur est acceptable → plus de service, principe « navigateur d'abord »
  intact.
- **No-go** : Kotlin sort du périmètre V1.

Sortie : ADR « Runtime Kotlin » (confirme ou remplace [0002](decisions/0002-kotlin-compilation-service.md)).

## R6 — Nom

**Question** : « Typika » est-il libre côté marques ? Temenos (Temenos AG) puis Palaestra (pris sur npm)
ont été abandonnés ([ADR 0014](decisions/0014-name-typika.md)).

Fait : `typika` libre sur npm, `typika.dev` libre, aucun compte ni organisation `typika` sur GitHub ;
aucun produit logiciel homonyme trouvé par recherche web (le plus proche : Typic, éditeur photo mobile).

À faire : recherche de marques déposées dans les classes 9 et 42 (EUIPO, USPTO, INPI) ; réserver le domaine,
l'organisation et le paquet.

Sortie : ADR 0014 confirmée, ou nom de repli (Patternhall, Deigmata) et renommage avant M1.
