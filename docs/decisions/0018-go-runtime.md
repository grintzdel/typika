# 0018 — Runtime Go : la toolchain Go compilée en WASM

**Statut** : Acceptée · 2026-10-08 · issue du spike [R7](../spikes.md) · Firefox à vérifier

## Contexte

Le runtime `go` doit compiler, exécuter et tester les variantes Go du catalogue dans le navigateur, avec une sortie
`go test -json` ([runtimes](../specs/runtimes.md)). Deux options étaient en lice. Le spike R7 les a fait tourner sur
`strategy-go` (10 fichiers, 12 sous-tests, deux exercices) et sur un relais concurrent (goroutines, `context`,
`t.Parallel`), avec Go 1.24.5.

**A — Yaegi** (interpréteur, master du 2026-02-09, dernière release en avril 2024, symboles de stdlib Go 1.22) :
5,7 Mo en brotli, ~180 ms par exécution. Mais il a quatre défauts sur un seul template de dix fichiers :

- `fmt.Printf("%s", order.Subtotal())` affiche `{%!s(int64=3250) EUR}` au lieu de `32.50 EUR` : la méthode `String()`
  d'un résultat interprété est perdue. La sortie est fausse, sans aucune erreur.
- `t.Errorf` situe l'échec dans `value.go:368`, pas dans le fichier de test.
- Les tests boîte noire (`package checkout_test`) échouent en « import cycle not allowed ».
- Une `const` qui convertit vers un type déclaré dans un autre fichier du package provoque un panic interne
  (« incomplete type »).

**B — Toolchain** : `cmd/compile` et `cmd/link` de Go, compilés en `js/wasm`, pilotés comme le ferait `go build` /
`go test` (ordre des packages, `importcfg`, `_testmain.go` généré), sur un FS en mémoire. Le programme produit est un
binaire `js/wasm` exécuté dans le même worker. Mesures (Playwright, Chromium 156 et WebKit 27.2, worker, page sans COOP
ni COEP) :

| | Chromium | WebKit | Chromium CPU ×4 |
|---|---|---|---|
| Build `test` de `strategy-go` (compile ×4 + link) | 250–300 ms | 240–310 ms | 1,1–1,2 s |
| Build `run` | 430–500 ms | ~310 ms | ~1,7 s |
| Exécution des tests | 15 ms | 14 ms | 70 ms |
| Relance après `worker.terminate()` d'une boucle infinie | 270 ms | 475 ms | — |

- **Fidélité native** : mêmes sorties, mêmes rouges et verts que `go test` sur les quatre états d'exercice, messages et
  `fichier:ligne` exacts, génériques de la stdlib, goroutines, `context`, `t.Parallel`. `-test.v=test2json` produit le
  flux que `test2json` convertit sans perte.
- **Pas de `SharedArrayBuffer`** : `crossOriginIsolated` est faux et `SharedArrayBuffer` absent, et tout fonctionne. Le
  runtime Go tourne donc en embed.
- **Poids**, en brotli : `compile.wasm` 5,5 Mo, `link.wasm` 1,95 Mo, stdlib précompilée 4,2 Mo (76 packages :
  `fmt`, `strings`, `sort`, `slices`, `maps`, `sync`, `time`, `context`, `encoding/json`, `testing`…). Total : 11,7 Mo,
  téléchargés une fois puis servis par le cache du Service Worker. Le `_testmain.go` généré fournit sa propre
  implémentation de `testDeps` : sans `testing/internal/testdeps`, 44 packages disparaissent (`go/ast`, `internal/fuzz`…).
- **Mémoire** : 24 à 28 Mio pour `compile`, 96 Mio pour `link`, 8 Mio pour le binaire de test.
- Les erreurs de compilation sortent au format `fichier:ligne:colonne: message`.

## Décision

- **Le runtime `go` embarque la toolchain Go officielle compilée en WASM** (option B). Yaegi est écarté : une sortie
  fausse sans erreur est inacceptable pour un outil d'apprentissage.
- **Le runtime fait le travail de la commande `go`** : graphe des packages du module, `importcfg`, découverte des
  `TestXxx`, génération du `_testmain.go`, compilation et link, cache des archives par hash des sources.
- **Une version de Go par version des assets.** Le `go.mod` des templates déclare la même version mineure. Monter de
  version, c'est reconstruire les assets ; les archives de la stdlib et le `testDeps` généré en dépendent.
- **La stdlib disponible est un jeu précompilé et fermé**, versionné avec les assets. La CI du registre refuse un
  template qui importe un package hors de ce jeu.
- **Le runtime Go est autorisé en embed.** Il n'exige pas d'isolation, contrairement à ce que l'ADR
  [0016](0016-isolation-and-embed.md) laissait ouvert.

## Conséquences

- Premier chargement lourd (11,7 Mo, ~10 s à 9 Mb/s) : la barre de progression du runtime et le cache sont
  indispensables (R3). Les runs suivants coûtent 0,3 à 1,2 s selon la machine.
- Les templates Go sont limités à la bibliothèque standard du jeu précompilé : pas de modules tiers, pas de `cgo`, pas
  de `go:embed`, pas de serveur `net/http`, pas d'`os/exec`. Le reste du langage est disponible.
- Le pilote (plan de build, `_testmain.go`, conversion `test2json`) est du code Typika à maintenir et à tester contre
  `go test` natif, comme la suite de conformité du `test-runner`.
- La licence BSD de Go s'applique aux assets redistribués : son texte accompagne les fichiers `.wasm` et la stdlib.
- **À vérifier à la main** : Firefox (Playwright n'a pas pu le lancer).

## Alternatives écartées

- **Yaegi** : léger et rapide, mais infidèle à Go sur du code ordinaire, et peu maintenu.
- **Service de compilation Go** (comme Kotlin) : un serveur à exploiter et à protéger, alors que le navigateur suffit.
- **Toute la stdlib** : du poids pour des packages qu'aucun template n'utilise ; le jeu s'élargit à la demande.
