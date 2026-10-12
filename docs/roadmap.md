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

État (2026-10-11) : lots 1 à 5 livrés. La barre d'outils indique que TypeScript démarre, ou qu'il est
indisponible, et un mot tapé avant que le worker soit prêt ouvre sa complétion dès qu'il l'est. Le panneau Tour
parcourt les étapes de `strategy-ts`, ouvre les fichiers ancrés dans des onglets d'éditeur et surligne leur plage ; le
rendu Markdown est tranché par [0020](decisions/0020-tour-markdown.md). `Alt+←` / `Alt+→` changent d'étape hors de
l'éditeur seulement, parce que CodeMirror les utilise déjà sur macOS (mot précédent / suivant). L'onglet Diff du
panneau latéral liste les fichiers modifiés depuis la base (restreints à `base.focus`) ou depuis le template, et les
ouvre en diff côte à côte ou unifié dans l'éditeur ([0021](decisions/0021-diff-engine.md)).
`/play/<name>?exercise=<id>` ouvre un projet local propre à l'exercice, sur son état de départ, calculé par
`exerciseStates` dans `@typika/manifest` pour que le lot 5 le réutilise. Le panneau Exercice suit les tests cibles à
chaque run, mémorise la réussite dans le `localStorage` du navigateur, dévoile les indices un par un, montre la
solution dans l'onglet Diff puis l'applique sur demande. « Recommencer » est le bouton Réinitialiser de la barre
d'outils, qui ramène à l'état de départ de l'exercice.
`pnpm template-check` (package `@typika/template-check`) valide chaque template de `templates/`, résout les refs
`[base]` et `[variants]` officielles vers les dossiers locaux et exécute les exercices `browser-js` dans Node avec le
bundler et le runner de la sandbox, pour que la commande et la sandbox jugent un template de la même façon. Les
exercices Go et Kotlin ne sont pas encore exécutés : leurs runtimes ne tournent que dans le navigateur ou derrière le
service de compilation.

Lot 6, vague (a) livrée : `observer-ts`, `decorator-ts`, `factory-method-ts`, `adapter-ts` et
`composition-over-inheritance-ts`, avec leur base, leur tour et leurs exercices. `/` liste les templates embarqués
(titre, résumé, langage, niveau ; les bases sont masquées) en attendant le hub du M3. `template-check` exécute
désormais chaque fichier de test à chaque run : un fichier au code inchangé disparaissait des runs suivants.

Vague (b) livrée : les cinq principes SOLID (`single-responsibility-ts`, `open-closed-ts`, `liskov-substitution-ts`,
`interface-segregation-ts`, `dependency-inversion-ts`), chacun avec sa base, son tour et ses exercices. Chaque base
partage sa suite de tests avec son template ; le template n'ajoute que des tests qui ciblent sa structure.

Vague (c) livrée : `naive-crud-ts`, la base commune, et les cinq architectures (`hexagonal-ts`, `cqrs-ts`,
`event-sourcing-ts`, `outbox-ts`, `state-machine-ts`), chacune avec son tour et ses deux exercices. La base expose dans
`openShop` un gestionnaire HTTP simulé et les faux d'infrastructure (`cards`, `broker`, `mailer`, `clock`) ; ses tests
passent par eux, si bien que chaque architecture les reprend tels quels.

Vague (d) livrée, et avec elle le lot 6 : `observer-js` et sa base, où `EventTarget` tient le rôle du sujet et un
`AbortSignal` celui du désabonnement ; `decorator-js`, où un notifier est une fonction et chaque décorateur une
fonction d'ordre supérieur ; `composition-over-inheritance-js`, dont la base montre `class` comme sucre sur la chaîne
de prototypes et le template une fonction fabrique qui garde ses parties dans sa portée. Le language service analyse
désormais les `.js` d'un projet sans `tsconfig.json`, et `template-check` ignore les erreurs non interceptées d'un
test, comme le worker de test.

Revue (2026-10-12) : le M2 est livré. Les 16 concepts du catalogue ont leur template TS, chacun avec sa base, un tour
de 5 ou 6 étapes et un exercice `refactor`, plus un exercice `fix` pour 10 d'entre eux. `pnpm template-check` passe sur
les 38 templates, exercices compris. La commande ne vérifie pas qu'un exercice `refactor` existe : ce point a été
relevé à la main, et passe dans V9 au M3. Les trois variantes JS sont livrées. Le guide d'écriture a été repris à
chaque vague. On passe au M3 comme prévu, parce que le M4 et le M5 supposent un registre. Ce qui reste ouvert :

- La recherche de marques sur « Typika » (R6) n'est pas faite. Le M3 crée les premiers dépôts publics : elle doit
  être faite avant.
- L'isolation n'a été vérifiée que dans Chromium (R2, R7, R8). Firefox et Safari restent à vérifier au plus tard au M4.
- La configuration Vercel, `SECURITY.md` et la CI GitHub sont toujours en attente. La CI devient nécessaire au M3,
  puisque le registre valide les PR et calcule la santé dans GitHub Actions.
- `ui.md` nomme la page template `/templates/<name>`, et `architecture.md` la nomme `/t/$templateId`. Le lot 3 du M3
  tranche.

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

### Découpage

Un lot = une branche `m3/<lot>` et une PR. Les lots 1 à 6 restent dans ce dépôt : `templates/` y joue le rôle de
`typika/templates`, et un dossier de registre local celui de `typika/registry`. Seul le lot 7 crée des dépôts sur
GitHub. Il demande des décisions qui ne sont pas techniques : l'organisation `typika`, la visibilité publique, et la
recherche de marques (R6).

| # | Lot | Contenu | Terminé quand |
|---|---|---|---|
| 1 | `registry-tools` | `packages/registry-tools` ([registry §1 à §3](specs/registry.md)) : schéma des fichiers d'entrée, validations V1 à V10 (en reprenant `@typika/template-check`, plus la règle « au moins un exercice `refactor` » des principes et des design patterns), génération de `index.json` et de son schéma JSON. Les variantes sont résolues en noms. Les refs `@<sha>` sont résolues vers un dossier local, en attendant le lot 7. | Un registre local qui référence les 38 templates produit un `index.json` valide, sous 500 Ko compressé. Une entrée cassée (nom en double, ref non épinglée, exercice `refactor` manquant) fait échouer la commande. |
| 2 | `index-source` | L'app lit l'index à l'URL `TYPIKA_REGISTRY_INDEX_URL` ([hosting](guides/hosting.md)) et charge les fichiers d'un template depuis sa ref épinglée, avec un cache. Un adaptateur GitHub remplace l'adaptateur `bundled` en production. L'adaptateur `bundled` reste pour les tests et le développement. États transverses de chargement et d'erreur ([ui §2](specs/ui.md)). Un projet local garde la ref d'origine ([registry §6](specs/registry.md)). | `/play/<name>` ouvre un template servi par un registre de test (index et fichiers sur un serveur local), sans que le template soit embarqué dans le bundle. |
| 3 | `hub-pages` | Pages du hub prérendues depuis l'index ([ui §3 à §5](specs/ui.md), [architecture §4](specs/architecture.md)) : l'accueil avec une carte par concept et « Reprendre », la liste à facettes dont les filtres vivent dans la query string, et la page template avec son sélecteur de langage, son tour, sa base, ses exercices et ses variantes. Le lot tranche la route de la page template, puis aligne `ui.md` et `architecture.md`. | Les trois pages sont lisibles sans JavaScript dans le build de production. Une URL de liste filtrée, rechargée, restaure ses filtres. |
| 4 | `search` | Recherche plein texte côté client sur `search.text` de l'index, combinée aux facettes, avec compteurs par valeur, tri et état vide ([ui §4](specs/ui.md)). Raccourci `/`. Une ADR si une dépendance entre. | Un test E2E cherche « switch », filtre sur `typescript` et trouve `strategy-ts`. Un filtre sans résultat affiche l'état vide et retire ses filtres un par un. |
| 5 | `i18n` | Les ressources `en` et `fr` existent déjà, et la langue est détectée depuis le navigateur. Le lot ajoute le menu de langue, la mémorisation locale, le formatage des dates et des nombres selon la langue, et le libellé « contenu en anglais » sur la page template ([ui §17](specs/ui.md)). Aucune chaîne en dur dans les nouvelles pages du hub. | Changer de langue dans le menu traduit le hub et la sandbox, et le choix survit au rechargement. Un test vérifie que chaque clé `en` existe en `fr`. |
| 6 | `health` | Le run de santé de [registry §4.2 et §4.3](specs/registry.md) devient une commande de `registry-tools`. Il démarre chaque template dans Chromium piloté par Playwright, lance ses tests, rejoue ses exercices et écrit `health/<name>.json`, que l'index intègre. Le hub affiche les badges `degraded`, et les bandeaux `broken` et `deprecated` ([ui §2](specs/ui.md)). | Un template volontairement cassé passe `broken` et son bandeau s'affiche. Un template rétabli redevient `healthy`. |
| 7 | `registry-repos` | Il faut d'abord la recherche de marques (R6) et l'accord sur l'organisation GitHub. Ensuite : création de `typika/templates`, où `templates/` part avec son historique, et de `typika/registry`, avec les workflows `validate-pr`, `build-index` et `health`, `CODEOWNERS` et `maintainers.toml`. Renovate est activé sur les deux dépôts. La publication de l'index déclenche la reconstruction de l'app ([hosting](guides/hosting.md)). | Le critère de fin du M3 : une PR au registre ajoute un template sans toucher à l'app, et sa santé apparaît sur le hub après le déploiement. |

État (2026-10-12) : lot 1 livré. `packages/registry-tools` vérifie le registre local `registry/`, qui a une entrée
par template (38) et le vocabulaire des 16 topics. Il lit chaque template à son commit épinglé, applique V1 à V7, V9 et
V10, puis écrit `index.json` (`pnpm registry:build`, 7 Ko compressé) et son schéma JSON. Les codes d'erreur du
registre sont ajoutés à `@typika/manifest`. Une modification d'un template n'entre dans l'index qu'une fois son
entrée réépinglée, comme le prévoit [registry §2.4](specs/registry.md). Au lot 7, extraire `templates/` change les
SHA : toutes les entrées seront réépinglées.

Lot 2 livré. L'app lit l'index à `TYPIKA_REGISTRY_INDEX_URL`, puis la liste et les fichiers d'un template à sa ref
épinglée, par deux gabarits d'URL au format de jsDelivr ([0022](decisions/0022-template-files-source.md)), avec un cache
mémoire par ref. Jusqu'au lot 7, le build écrit l'index et un miroir des templates (`registry-tools mirror`) dans
`dist/client/registry/`, et les valeurs par défaut pointent dessus : `.git` entre dans le contexte Docker. L'adaptateur
`bundled` ne sert plus qu'en développement et dans les tests unitaires ; il est absent du bundle de production. Un
projet local enregistre la ref d'où il vient, et son diff et son reset la gardent quand l'index avance. L'accueil et la
sandbox affichent des squelettes pendant le chargement, et une erreur qui nomme sa cause, avec « Réessayer » quand elle
est passagère. L'E2E de production sert le miroir depuis une autre origine, ouvre `/play/strategy-ts` et vérifie
qu'aucun template n'est dans le bundle.

Lot 3 livré. La page template est à `/templates/$name`, et `ui.md` et `architecture.md` sont alignés
([0023](decisions/0023-hub-prerendering.md)). Le build prérend l'accueil, la liste et les 21 pages template depuis
l'index du build. Un plugin Vite le construit avec `registry-tools` et le fournit au serveur comme module virtuel :
aucun index n'entre dans le bundle client. L'accueil montre une carte par concept, groupée par catégorie, et
« Reprendre » liste les trois derniers projets locaux. La liste filtre par topic (catégorie puis famille), langage,
paradigme, niveau, framework, bibliothèque, cas d'usage et catégorie ; ses filtres vivent dans la query string et
s'appliquent après l'hydratation. Elle a un état vide qui retire ses filtres un par un. La page template montre son
tour, sa base avec un lien vers le diff (`/play/<name>?panel=diff`), ses exercices et ses variantes. Le serveur sert
chaque page prérendue avec une CSP qui autorise ses propres scripts inline. Le HTML est en anglais, et la langue du
navigateur s'applique après l'hydratation. L'E2E de production lit les trois pages sans JavaScript, recharge une liste
filtrée et vérifie que l'hydratation ne lève aucune erreur.

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
