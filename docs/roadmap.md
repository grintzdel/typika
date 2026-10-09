# Roadmap

On avance pas à pas : pas de date, pas de lancement. Chaque jalon livre quelque chose d'utilisable et se termine par
une revue qui décide du suivant. L'ordre ci-dessous est le plan actuel, pas un engagement.

## Vue d'ensemble

| Jalon | Thème | Résultat utilisable |
|---|---|---|
| **M0** | Spikes | Les choix techniques risqués sont tranchés et consignés en ADR. |
| **M1** | Socle | Ouvrir un template TS local, l'éditer, l'exécuter, lancer ses tests. |
| **M2** | Pédagogie | Le catalogue en TS avec bases, tours et exercices. |
| **M3** | Hub | Parcourir, chercher et ouvrir les templates depuis le registre, avec leur santé. |
| **M4** | Go & comparaison | Variantes Go et mode comparaison TS / Go. |
| **M5** | Partage | Embed, partage par URL et gist, export, CLI. |
| **M6** | Kotlin | Variantes Kotlin via le service de compilation. |

```
M0 ──► M1 ──► M2 ──► M3 ──┬──► M4 ──► M6
                          └──► M5
```

M4 et M5 sont indépendants ; M6 dépend de M4 (mode comparaison).

---

## M0 — Spikes

**Objectif** : lever les inconnues qui pourraient invalider l'architecture avant d'écrire du code durable.

Livrables :

- Spikes R1, R2, R4, R7, R8 menés selon [spikes](spikes.md) — prototypes jetables, hors du monorepo.
- Un ADR par décision prise ([decisions](decisions/README.md)).
- Le premier template rédigé **sur papier** (Strategy en TS : base, tour, exercice `refactor`) pour valider le format
  du [manifeste](specs/manifest.md) sur un cas réel. Il sert de jeu d'essai aux spikes et au M1.
- Recherche de marques formelle sur « Typika » (R6, [ADR 0014](decisions/0014-name-typika.md)).

Terminé quand : chaque spike a une conclusion écrite (go / no-go / plan B) et le manifeste est figé en `schema = 1`.

État (2026-10-08) : R1, R2, R4, R7 et R8 sont conclus, et le [manifeste](specs/manifest.md) est figé en `schema = 1`.
Il reste R6.

## M1 — Socle

**Objectif** : la boucle de base fonctionne de bout en bout pour un template TS.

Livrables :

- Monorepo (pnpm, Turborepo, oxlint, oxfmt, Vitest, Playwright) — voir [architecture](specs/architecture.md).
- `packages/manifest` : schéma Effect, parser TOML, résolution des refs, erreurs de validation.
- `packages/runtime-core` : `RuntimePort` et événements de test normalisés — voir [runtimes](specs/runtimes.md).
- `packages/runtime-browser-js` et `packages/test-runner`.
- `apps/web` : sandbox minimale (arbre de fichiers, éditeur CodeMirror 6, console, panneau tests), projets en
  IndexedDB, reset.
- Image Docker et configuration des headers COOP/COEP, vérifiés par un test E2E — voir [hosting](guides/hosting.md).
- Le template Strategy du M0, réel et vert.

Terminé quand : on ouvre le template Strategy, on le modifie, on lance ses tests, on recharge la page et les
modifications sont toujours là.

État (2026-10-09) : le monorepo, `packages/manifest` et `packages/runtime-core` sont livrés.

## M2 — Pédagogie

**Objectif** : ce qui distingue Typika d'une sandbox existe.

Livrables :

- Visites guidées (panneau, surlignage, synchronisation avec l'éditeur).
- Vue « diff depuis la base ».
- Exercices `fix` et `refactor` : état de départ, progression, validation, solution.
- Les 16 concepts du [catalogue](specs/catalogue.md) en TS, et les variantes JS prévues.
- [Guide d'écriture de templates](guides/template-authoring.md) éprouvé sur ces 16 templates.

Terminé quand : chaque template TS du catalogue a une base, un tour complet et au moins un exercice `refactor`, et
ses tests sont verts.

## M3 — Hub

**Objectif** : les templates vivent dans un registre, pas dans le code de l'app.

Livrables :

- Dépôt registre, `packages/registry-tools` (génération de `index.json`, CI de santé) — voir [registry](specs/registry.md).
- Renovate sur les dépôts `typika/*`.
- Pages hub prérendues : accueil, liste à facettes, page template — voir [ui](specs/ui.md).
- Recherche côté client sur l'index.
- Interface en anglais et en français.

Terminé quand : ajouter un template se fait par une PR au registre, sans toucher à l'app, et son état de santé
apparaît sur le hub.

## M4 — Go & comparaison

**Objectif** : la deuxième langue et la comparaison, cœur de la leçon « le langage fait partie du pattern ».

Livrables :

- `packages/runtime-go` : toolchain Go en WASM et pilote de build ([0018](decisions/0018-go-runtime.md)).
- Variantes Go prévues au catalogue.
- Mode comparaison : deux variantes côte à côte, synchronisées par étape de tour.

Terminé quand : on compare Strategy en TS et en Go étape par étape, et la variante Go montre pourquoi le pattern s'y
réduit à une fonction.

## M5 — Partage

**Objectif** : sortir les templates de Typika.

Livrables — voir [sharing-and-cli](specs/sharing-and-cli.md) :

- Embed `/embed/<name>` et snippet copiable.
- Partage par URL, partage par gist (GitHub OAuth).
- Export zip, push vers un nouveau dépôt GitHub.
- CLI `typika create` et `typika validate`.

Terminé quand : un template est embarqué dans une page tierce et exécutable, et `npx typika create strategy-ts`
produit un projet qui passe ses tests hors de Typika.

## M6 — Kotlin

**Objectif** : le langage POO de référence du catalogue.

Livrables :

- `services/kotlin-compiler` : service maison sur `kotlin-compiler-embeddable`, cible JS ([0019](decisions/0019-kotlin-runtime.md)), avec
  limites et rate limiting — voir [security](specs/security.md).
- `packages/runtime-kotlin`.
- Variantes Kotlin des 16 concepts.

Terminé quand : les 16 concepts sont comparables TS / Kotlin, et le service de compilation tient une charge de test
sans dépasser ses limites.

---

## Après M6 (non planifié)

Pistes, à prioriser le moment venu :

- Vagues suivantes de design patterns (GoF restants, puis Repository, Unit of Work, Specification, Null Object,
  Result / Either) — voir [catalogue](specs/catalogue.md).
- Plus de fondamentaux POO si le premier template trouve son public.
- Traduction des tours (`tour/<locale>/`).
- Runner auto-hébergeable pour des langages sans runtime navigateur.
- Stacks composables.

## Risques suivis

| # | Risque | Traitement |
|---|---|---|
| R1 | Licence WebContainers | Levé : pas de runtime `node` en V1 ([0017](decisions/0017-node-runtime.md)) |
| R2 | COOP/COEP casse l'embed | Levé pour `browser-js` ([0016](decisions/0016-isolation-and-embed.md)) ; Firefox et Safari réel à vérifier |
| R3 | Poids des runtimes | Lazy-load, cache Service Worker, CDN — M1 / M4 |
| R4 | IntelliSense TS dans CodeMirror 6 | Levé : CodeMirror 6 confirmé ([0015](decisions/0015-editor.md)) |
| R5 | Pourrissement des templates | CI de santé + Renovate — M3 |
| R6 | Nom du projet | Typika retenu ([0014](decisions/0014-name-typika.md)) ; recherche de marques au M0 |
| R7 | Go dans le navigateur | Levé : toolchain Go en WASM ([0018](decisions/0018-go-runtime.md)) ; Firefox à vérifier |
| R8 | Service de compilation Kotlin | Levé : service maison, cible JS ([0019](decisions/0019-kotlin-runtime.md)) ; Firefox à vérifier |
| R9 | Abus du service de compilation | Limites et isolation — M6 |
