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

État (2026-10-09) : le monorepo, `packages/manifest`, `packages/runtime-core`, `packages/test-runner` (avec sa suite
de conformité contre Vitest) et `packages/runtime-browser-js` (testé dans Chromium avec le template Strategy) sont
livrés. La preview de `browser-js` attend un template qui en a besoin.

État (2026-10-10) : `apps/web` ouvre un template du dépôt sur `/play/<name>` : arbre de fichiers, éditeur CodeMirror,
Run et Tests exécutés dans la runtime frame, sur une origine séparée et isolée. Restent : la persistance des projets
en IndexedDB et le reset, l'image Docker avec le test E2E des en-têtes, et le language service TypeScript de
l'éditeur.

État (2026-10-11) : les projets sont persistés en IndexedDB. Une modification d'un template crée son projet local,
recharger la page le rouvre, et Reset rend les fichiers du template après confirmation : le critère de fin du M1 est
rempli. Restent l'image Docker avec le test E2E des en-têtes, et le language service TypeScript de l'éditeur.

État (2026-10-11) : l'image Docker sert l'app et la runtime frame depuis un serveur Node qui pose les en-têtes par hôte
et par chemin, derrière Caddy pour TLS et HSTS. La suite E2E de production vérifie les en-têtes de chaque route et
exécute un template sous la CSP réelle, contre le build local comme contre l'image. Reste le language service
TypeScript de l'éditeur.

État (2026-10-11) : l'éditeur a son language service TypeScript dans un worker : complétion avec auto-import,
diagnostics multi-fichiers, survol et aide aux signatures, activés dès que le worker est prêt. Le M1 est livré.

Revue (2026-10-11) : on passe au M2 comme prévu. Le M3 n'a de sens qu'avec un catalogue à publier, et le M4 comme
le M5 viennent après le M3. Ce qui reste ouvert après le M1 :

- Si l'on tape avant que le worker TypeScript soit prêt, la complétion ne s'ouvre qu'à la frappe suivante, et aucun
  indicateur ne montre que le worker démarre. Ces deux points sont corrigés au premier lot du M2, puisque tours et
  exercices font taper dès l'ouverture.
- La recherche de marques sur « Typika » (R6) n'est pas faite. Elle doit l'être avant toute mise en ligne publique.
- L'isolation n'a été vérifiée que dans Chromium (R2, R7, R8). Firefox et Safari sont à vérifier au plus tard au M4.
- La configuration Vercel, `SECURITY.md` et la CI GitHub restent en attente : le contrôle avant merge est local.

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

### Découpage

Un lot = une branche `m2/<lot>` et une PR. Les lots 2 à 4 construisent l'interface sur `strategy-ts`, qui a déjà
son tour et ses deux exercices. Le lot 5 outille la vérification des templates. Le lot 6 écrit le reste du catalogue
en s'appuyant sur cet outil.

| # | Lot | Contenu | Terminé quand |
|---|---|---|---|
| 1 | `language-service-startup` | Une complétion demandée avant que le worker soit prêt s'ouvre quand il l'est. Un indicateur discret montre que TypeScript démarre. | Un test E2E tape dès l'ouverture et obtient la complétion sans seconde frappe. |
| 2 | `tour` | Panneau Tour ([ui §7](specs/ui.md)) : rendu Markdown sans HTML brut, navigation Préc. / Suiv. et par la liste, ouverture du fichier ancré, surlignage `lines` ou `region` sans les marqueurs, onglets `also`, `#step=<id>` dans l'URL, `Alt+←` / `Alt+→`, annonce `aria-live`. Si le code a changé, l'étape le signale et ouvre l'original en lecture seule. `tour/` et `typika.toml` sont regroupés et en lecture seule dans l'arbre. Un lien `typika:<name>` ouvre `/play/<name>` quand le template est embarqué. | Le tour de `strategy-ts` se parcourt en entier au clavier, et une étape rechargée par son URL rouvre le bon fichier sur la bonne plage. |
| 3 | `diff` | Onglet Diff ([ui §6.4 et §8](specs/ui.md)) : « Depuis la base », restreint à `base.focus`, et « Mes modifications ». Vues côte à côte et unifiée, signes `+` / `-`, marqueurs vers les étapes du tour, bouton « Ouvrir la base ». La source de templates résout les refs `[base]` vers les templates embarqués. | Le diff `strategy-base-ts` → `strategy-ts` montre les fichiers de `src/checkout/` et renvoie vers les étapes ancrées. |
| 4 | `exercises` | `/play/<name>?exercise=<id>` ([ui §10](specs/ui.md), [manifest §6](specs/manifest.md)) : état de départ (`from`, surcouche `start/`, `.typika-remove`), un projet local par exercice, panneau Exercice (énoncé, tests cibles, progression), validation à chaque run de tests, réussite mémorisée localement, indices un par un, solution (selon `solutionFrom`) montrée en diff puis appliquée sur demande, Recommencer. Le calcul des états de départ et de solution vit dans un package, pour être réutilisé par le lot 5. | Les deux exercices de `strategy-ts` se résolvent de bout en bout en E2E. |
| 5 | `template-check` | Une commande vérifie chaque template de `templates/` : manifeste valide, refs `[base]` et `[variants]` résolues, ancres de tour présentes, puis les règles de [manifest §6.4](specs/manifest.md) (départ rouge sur les seuls fichiers `failing`, solution entièrement verte). Elle fait partie du contrôle local et préfigure `packages/registry-tools` du M3. | `strategy-ts` passe, et un exercice volontairement cassé fait échouer la commande. |
| 6 | `catalogue-*` | Les 15 concepts restants en TS, leurs bases et les 3 variantes JS, en vagues : (a) Observer, Decorator, Factory Method, Adapter, composition vs héritage ; (b) les cinq principes SOLID ; (c) `naive-crud-ts` puis les cinq architectures ; (d) `observer-js`, `decorator-js`, `composition-over-inheritance-js`. La première vague remplace la redirection de `/` par une liste simple des templates embarqués, en attendant le hub du M3. Chaque vague met à jour le [guide d'écriture](guides/template-authoring.md) avec ce qu'elle a appris. | Le critère de fin du M2 ci-dessus, vérifié par la commande du lot 5. |

À trancher pendant les lots, avec un ADR si une dépendance entre : le rendu Markdown du tour (lot 2) et le moteur de
diff (lot 3, `@codemirror/merge` en premier candidat puisque l'éditeur est CodeMirror 6). Au lot 6, il faut aussi
vérifier que le language service et la runtime `browser-js` traitent un template JS aussi bien qu'un template TS.

État (2026-10-11) : lots 1 à 3 livrés. La barre d'outils indique que TypeScript démarre, ou qu'il est
indisponible, et un mot tapé avant que le worker soit prêt ouvre sa complétion dès qu'il l'est. Le panneau Tour
parcourt les étapes de `strategy-ts`, ouvre les fichiers ancrés dans des onglets d'éditeur et surligne leur plage ; le
rendu Markdown est tranché par [0020](decisions/0020-tour-markdown.md). `Alt+←` / `Alt+→` changent d'étape hors de
l'éditeur seulement, parce que CodeMirror les utilise déjà sur macOS (mot précédent / suivant). L'onglet Diff du
panneau latéral liste les fichiers modifiés depuis la base (restreints à `base.focus`) ou depuis le template, et les
ouvre en diff côte à côte ou unifié dans l'éditeur ([0021](decisions/0021-diff-engine.md)).

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
