# 0015 — Éditeur : CodeMirror 6 et adaptateur TypeScript maison

**Statut** : Acceptée · 2026-10-08 · remplace [0008](0008-codemirror-6.md) · issue du spike [R4](../spikes.md)

## Contexte

L'ADR 0008 retenait CodeMirror 6 sous réserve que l'IntelliSense TypeScript y soit suffisant. Le spike R4 a comparé
CodeMirror 6 (language service TS 6.0 dans un worker via `@valtown/codemirror-ts`, `@typescript/vfs` et Comlink) et
Monaco 0.57, sur le template Strategy étendu à 22 fichiers avec imports croisés.

Mesures (Chromium, build de prod, brotli ; « mobile » = Pixel 7 émulé, CPU ×4, 9 Mb/s, 150 ms de RTT) :

| | CodeMirror 6 | Monaco |
|---|---|---|
| Éditeur interactif, desktop / mobile | 55 ms / 769 ms | 174 ms / 1 699 ms |
| Language service prêt, desktop / mobile | 326 ms / 2 202 ms | 527 ms / 3 311 ms |
| Complétion médiane / p95, desktop | 31 / 33 ms | 130 / 134 ms |
| Diagnostics multi-fichiers affichés | oui | non : les marqueurs d'un fichier ne sont pas recalculés quand un fichier importé change |
| Poids, éditeur seul | 140 Kio | 1 035 Kio |
| Poids total avec language service et libs | ~1,15 Mo (~0,9 Mo sans DOM) | ~2,05 Mo |

Le critère « complétion < 200 ms après démarrage » est tenu avec une marge large. WebKit donne des chiffres du même
ordre ; Firefox n'a pas pu être lancé dans l'environnement du spike.

## Décision

**CodeMirror 6**, avec un **adaptateur TypeScript écrit dans le module `editor`** plutôt que `@valtown/codemirror-ts`
(non maintenu depuis septembre 2025). On garde `@typescript/vfs` et Comlink. L'adaptateur ajoute ce que le paquet
n'offre pas : auto-import (`includeCompletionsForModuleExports` et application via `getCompletionEntryDetails`), aide
aux signatures, suppression de fichiers, relance des diagnostics à l'ouverture d'un fichier, délai de lint à 300 ms.

- **Chargement en deux temps** : l'éditeur s'affiche d'abord, le worker démarre ensuite et les extensions TS sont
  activées par un `Compartment`. L'éditeur est utilisable 270 ms (desktop) à 1,4 s (mobile) avant le language service.
- **Libs** : le worker charge `lib.es2022` sans DOM (33 Kio au lieu de 287), plus la déclaration de `console` et de
  `vitest`. Celle de `vitest` est émise au build depuis les sources de `@typika/test-runner` (mise en œuvre au M1). Le runtime `browser-js` n'a pas de DOM : un template qui
  en a besoin passe par la preview.
- **Version de TypeScript** : le worker est épinglé sur `typescript@6.0.x`. TS 7, natif, n'a pas d'API JS utilisable
  dans un navigateur ; les templates, eux, vérifient leurs types avec TS 7 hors de la sandbox.
- **Embed** : éditeur sans language service par défaut (~140 Kio). L'IntelliSense se charge à la demande.

## Conséquences

- L'embed reste léger, ce qui compte pour une page de blog.
- Environ 200 lignes d'adaptateur à écrire et maintenir au M1, testées comme le reste du module `editor`.
- Les diagnostics de la sandbox (TS 6) peuvent différer de ceux de la CI (TS 7). La CI de santé fait foi ; l'écart
  est suivi à chaque montée de version.
- Le language service et Lezer sont en JavaScript : la CSP de l'app n'a pas besoin de `'wasm-unsafe-eval'`.

## Alternatives écartées

- **Monaco** : complétion 4× plus lente, 2× plus lourd, et diagnostics inter-fichiers à corriger nous-mêmes.
- **`@valtown/codemirror-ts` tel quel** : pas d'auto-import, pas de suppression de fichiers, plus de mises à jour.
