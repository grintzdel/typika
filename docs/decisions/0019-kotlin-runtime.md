# 0019 — Runtime Kotlin : un service de compilation maison, cible JS

**Statut** : Acceptée · 2026-10-08 · issue du spike [R8](../spikes.md) · remplace [0002](0002-kotlin-compilation-service.md)

## Contexte

Le runtime `kotlin` doit compiler les variantes Kotlin du catalogue, puis exécuter le programme et ses tests
`kotlin.test` dans le navigateur ([runtimes](../specs/runtimes.md)). L'ADR 0002 prévoyait un service bâti sur
`kotlin-compiler-server` (JetBrains). Le spike R8 a écrit `strategy-kotlin` (16 fichiers, 11 tests, deux exercices) et
l'a compilé avec Kotlin 2.4.21 de trois façons : le CLI `kotlinc-js` / `kotlinc-wasm`, `kotlin-compiler-server` (master
du 2026-09-29, Kotlin 2.4.21-RC) en conteneur, et un service minimal d'une centaine de lignes qui appelle le compilateur en
processus. Les artefacts ont été exécutés dans un worker sous Chromium 156 et WebKit 27.2 (Playwright).

**`kotlin.test` hors JVM fonctionne.** Le compilateur génère l'enregistrement des tests : au chargement (JS) ou à
l'appel de `startUnitTests()` (Wasm), chaque classe de test devient une suite et chaque `@Test` un test, passés à
l'adaptateur de `kotlin.test`. Un harness d'une quarantaine de lignes fournit `describe` / `it` (adaptateur
« Jasmine »), exécute les tests et émet des événements. Résultat sur les quatre états d'exercice, en JS comme en Wasm,
dans les deux navigateurs : exactement les mêmes verts et rouges que `gradle test` sur JVM, avec les mêmes messages
(`Expected <12.90 EUR>, actual <0.00 EUR>.`). En JS, la source map situe l'échec sur la ligne exacte du test
(`ExpressShippingTest.kt:13:9`). Exécution : 5 à 25 ms.

**`kotlin-compiler-server` ne convient pas tel quel** :

- Son image ne démarre pas sur `master` : le Dockerfile omet le loader Spring Boot (`NestedFileSystemProvider not
  found`). Corrigé en une ligne pour le spike.
- Ses bibliothèques JS et Wasm ne contiennent que la stdlib : sans ajouter `kotlin-test-js` et `kotlin-test-wasm-js`,
  aucun test ne compile. Son endpoint `/test` exécute JUnit **sur le serveur**, à l'opposé de [0001](0001-browser-first.md).
- Il expose aussi `/run` (exécution JVM), la complétion et Compose : de la surface d'attaque pour des fonctions que
  Typika n'utilise pas. Image : 1,73 Go.
- Sa sortie est taillée pour play.kotlinlang.org : JS en UMD avec des lignes injectées à position fixe, Wasm en base64
  dans le JS. Les chemins de fichiers avec `/` font échouer la compilation.

**Le service minimal** (JDK `HttpServer`, `kotlin-compiler-embeddable`, `kotlinx-serialization`) fait la même
compilation en deux phases (klib, puis JS ou Wasm avec DCE), avec les chemins du projet, en module ES et source map,
sans appeler `main` en mode test. Image : 628 Mo, démarrage en 0,6 s, 71 à 95 Mio au repos.

Mesures sur `strategy-kotlin` (sources et tests), conteneur plafonné, hôte Apple M4 Pro. Un vCPU de VPS est plus lent :
compter environ 1,5 à 2 fois ces latences.

| Conteneur | 1ʳᵉ compilation | À chaud, seul | Débit saturé (c = 8) | p95 à c = 8 | Mémoire max |
|---|---|---|---|---|---|
| Service minimal, 2 vCPU, 1 Gio | 5,9 s | 0,9–1,3 s | 2,2 compil./s | 5,2 s | 656 Mio |
| Service minimal, 4 vCPU, 2 Gio | 5,0 s | 0,8–1,2 s | 4,4 compil./s | 2,2 s | 1 021 Mio |
| Service minimal, 1 vCPU, 1 Gio | 10,8 s | 1,9–2,4 s | 1,3 compil./s | 8,6 s | 562 Mio |
| Service minimal, 2 vCPU, 512 Mio | 5,7 s | 0,9–1,3 s | 1,0 compil./s | 12,3 s | 512 Mio (saturée) |
| `kotlin-compiler-server`, 2 vCPU, 1 Gio | 6,2 s | 1,0–1,7 s | 1,75 compil./s | 10,0 s | 644 Mio |

- Wasm compile au même prix que JS (0,9–1,4 s à chaud). Une erreur de compilation répond plus vite (0,4 s à chaud) :
  la deuxième phase n'a pas lieu.
- Artefact de `strategy-kotlin` en brotli : JS 20 Ko (+ 11 Ko de source map), Wasm 65 Ko.
- Les diagnostics sortent au format `fichier:ligne:colonne`, relatifs au projet. Une API `java.*` est refusée à la
  compilation (`unresolved reference 'java'`).

**CheerpJ** (`kotlinc` dans une JVM WASM) est écarté sans prototype : l'édition Community interdit l'auto-hébergement et
la redistribution, ce qui exclut les instances tierces, comme WebContainers dans R1. Le compilateur seul pèse 55 Mo en
brotli, sans la JVM.

## Décision

- **Un service de compilation maison**, `services/kotlin-compiler`, sur `kotlin-compiler-embeddable` (Apache 2.0). Pas
  de `kotlin-compiler-server`. Le service ne fait que compiler : aucun endpoint n'exécute de code.
- **Cible JS uniquement en V1.** Elle est trois fois plus légère que Wasm, a des source maps qui situent les échecs, et
  ne demande ni Wasm GC ni exception handling au navigateur. Le harness gère déjà Wasm : l'ajouter plus tard ne
  touche ni les templates ni le protocole.
- **La cible n'est pas un choix du template.** Le champ `runtime.target` sort du manifeste : le code commun des
  templates compile pour les deux cibles, c'est le runtime qui choisit.
- **Bibliothèques fermées** : stdlib et `kotlin.test` de la version du compilateur, rien d'autre. Une version de
  Kotlin par version du service.
- **Mode test** : les sources et les tests sont compilés ensemble, `main` n'est pas appelé. Le harness du runtime
  fournit l'adaptateur `kotlin.test` et traduit les résultats en `TestEvent`.
- **Le runtime Kotlin est autorisé en embed.** Il exécute un module JS dans un worker, sans `SharedArrayBuffer` : les
  mesures ci-dessus ont été faites dans une page sans COOP ni COEP. Comme pour Go, cela tranche la question que l'ADR
  [0016](0016-isolation-and-embed.md) laissait ouverte.
- **Dimensionnement de référence** : 2 vCPU, 1 Gio, 2 compilations simultanées, une compilation de chauffe au
  démarrage. En dessous de 1 Gio, le ramasse-miettes s'effondre dès deux compilations simultanées.

## Conséquences

- Le principe [0001](0001-browser-first.md) garde une seule exception : la compilation Kotlin. Le code compilé ne
  s'exécute que dans le navigateur.
- Un service à maintenir, mais petit : le compilateur est une dépendance, le reste tient en un fichier. Monter de
  version de Kotlin, c'est reconstruire l'image et recompiler les artefacts précompilés du registre.
- La première compilation après démarrage coûte 5 à 11 s (JIT de la JVM). La compilation de chauffe la fait avant la
  première requête.
- Un « Run » ou un test modifié coûte environ 1 s sur l'instance de référence, 2 à 4 s sous charge. Le cache par hash
  des sources et les artefacts précompilés du registre ([runtimes](../specs/runtimes.md) §6.4) évitent la plupart des
  appels.
- Une compilation ne s'interrompt pas depuis un autre thread de la JVM : le timeout du service (15 s) demande soit un
  processus de compilation séparé, soit le redémarrage du conteneur. À trancher au M6 avec R9.
- Templates Kotlin : pas de `java.*`, pas de `kotlinx.coroutines` (hors stdlib), et des noms de tests sans `.`, que la
  JVM refuse dans les noms de méthodes (voir le [guide d'écriture](../guides/template-authoring.md)).
- **À vérifier à la main** : Firefox (Playwright n'a pas pu le lancer).

## Alternatives écartées

- **`kotlin-compiler-server`** : il marche une fois corrigé, mais il apporte l'exécution JVM, Compose et un format de
  sortie à défaire, pour une image trois fois plus lourde et un débit plus faible.
- **CheerpJ** : licence incompatible avec l'auto-hébergement, 55 Mo de compilateur.
- **Cible Wasm par défaut** : aucun gain mesuré sur l'exécution, un artefact trois fois plus lourd, pas de position
  d'échec sans DWARF, et `main` exécuté au chargement même en mode test.
- **Retirer Kotlin de la V1** : inutile, les critères du spike sont tenus.
