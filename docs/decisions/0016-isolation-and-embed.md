# 0016 — Isolation cross-origin et embed

**Statut** : Acceptée · 2026-10-08 · issue du spike [R2](../spikes.md) · Firefox et Safari réel à vérifier

## Contexte

`SharedArrayBuffer` n'existe que dans un contexte isolé (`crossOriginIsolated`), ce qui exige COOP et COEP. L'embed
s'affiche dans la page d'un site tiers qui ne pose aucun en-tête, et la runtime frame est servie depuis une origine
dédiée ([0013](0013-dedicated-runtime-origin.md)). La question : quels runtimes peuvent tourner en embed, et avec
quels en-têtes ?

Le spike R2 a monté trois sites distincts (hôte tiers sans en-têtes, app `/embed/strategy`, runtime) et la chaîne
réelle : hôte → embed → runtime frame (`sandbox`, `allow="cross-origin-isolated"`) → worker esbuild-wasm qui bundle le
template Strategy, exécute ses tests et `main.ts`. 56 combinaisons d'en-têtes par navigateur, sur Chromium 156,
Chrome 154 et WebKit 27.2 (Playwright).

Résultats :

- **En embed, aucune isolation n'est possible.** `crossOriginIsolated` reste faux à tous les niveaux, quels que soient
  les en-têtes de l'app et du runtime : seule la page hôte, au niveau supérieur, pourrait l'obtenir.
- **`browser-js` n'en a pas besoin.** esbuild-wasm tourne sans `SharedArrayBuffer` (initialisation ~60 ms, build du
  template ~300 ms sur Chromium) ; les 11 tests passent ; le kill dur par `worker.terminate()` fonctionne.
- **`credentialless` ne vaut rien sur WebKit** : il est ignoré, la page n'est jamais isolée. `require-corp` isole sur
  les deux moteurs.
- **Sans `allow="cross-origin-isolated"`**, Chromium n'isole pas la runtime frame cross-origin, même dans la sandbox.
- **Sans `Cross-Origin-Resource-Policy: cross-origin`** sur la runtime frame, celle-ci est bloquée dès que son parent
  pose une COEP ; un script de worker servi sans COEP est bloqué de la même façon.
- **Le stockage de l'embed est partitionné par site hôte** (IndexedDB sur les deux moteurs ; `localStorage` non
  partitionné dans le WebKit de Playwright).

## Décision

- **L'embed n'est pas isolé** : `/embed/*` ne pose ni COOP ni COEP. Ces en-têtes n'y apportent rien et ne font
  qu'ajouter des risques de blocage. Il garde `Cross-Origin-Resource-Policy: same-origin` et `frame-ancestors *`.
- **L'embed exécute `browser-js`**. Un runtime qui exige `SharedArrayBuffer` (selon les spikes R7 et R8) n'y démarre
  pas : l'embed affiche « Ouvrir dans Typika ». C'est le cas normal, pas une erreur.
- **COEP = `require-corp`** partout où l'on isole (sandbox, comparaison, partage, origine runtime). `credentialless`
  est écarté.
- **Origine runtime** : COEP `require-corp` et CORP `cross-origin` sur **toutes** les réponses, y compris les scripts de
  worker et les `.wasm`.
- **L'iframe runtime garde `allow="cross-origin-isolated"`**.
- **L'embed ne s'appuie pas sur `localStorage`** ; il n'a de toute façon aucune persistance locale.

## Conséquences

- Les blogs n'ont rien à configurer pour embarquer un template TS ou JS.
- Les templates Go et Kotlin pourront ne pas s'exécuter en embed ; l'utilisateur est renvoyé vers l'app. À trancher
  par runtime à la sortie de R7 et R8.
- Le premier run en embed télécharge esbuild-wasm : 2,68 Mo en brotli. Le runtime ne démarre qu'à la première
  interaction (déjà prévu) ; le CDN et le cache relèvent de R3.
- Un test E2E vérifie au M1 les en-têtes de chaque route, et au M5 que l'embed exécute un template dans une page hôte
  sans en-têtes.
- **À vérifier à la main** : Firefox (Playwright n'a pas pu le lancer) et Safari réel (WebKit Playwright n'en est
  qu'un proxy), dont le partitionnement de `localStorage`.

## Alternatives écartées

- **COOP + COEP sur l'embed** : aucune isolation obtenue dans une page tierce, et des ressources bloquées en plus.
- **COEP `credentialless`** : plus souple pour les ressources tierces, mais sans effet sur WebKit.
- **Demander aux sites hôtes de poser COOP/COEP** : contraire à l'objectif d'un embed sans configuration, et cela
  casserait souvent le reste de leur page.
