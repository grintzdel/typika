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

Lot 4 livré, en deux PR. La première ajoute au manifeste un champ optionnel `keywords`, repris dans `search.text`,
sans changer de version de schéma tant que rien n'est publié ([0024](decisions/0024-manifest-keywords.md)) : les trois
templates Strategy y reçoivent `switch`. La seconde réépingle leurs entrées et ajoute la recherche au hub. Le champ de
l'en-tête cherche depuis toutes les pages, `/` y place le focus, et sans JavaScript il envoie un formulaire vers la
liste. Chaque mot tapé doit commencer un mot de `search.text`. La liste montre, pour chaque valeur de facette, le
nombre de résultats qu'elle donnerait, désactive celles à 0, et trie par pertinence, ordre du catalogue ou date de mise
à jour (`?q=` et `?sort=`). L'état vide retire aussi la recherche. Aucune dépendance n'est entrée : 21 templates se
cherchent en parcourant l'index.

Lot 5 livré. Un menu de langue est dans l'en-tête du hub et dans la barre d'outils de la sandbox. Le choix est gardé
localement et l'emporte sur la langue du navigateur au rechargement. Le menu est désactivé jusqu'à l'hydratation, pour
qu'un choix fait trop tôt ne soit pas perdu. Les pages prérendues restent en anglais, et la langue choisie s'applique
après l'hydratation. Les compteurs et les durées sont formatés selon la langue. La page template affiche sa date de mise
à jour et, dans une autre langue que l'anglais, indique que le contenu des templates est en anglais. Un test vérifie que
chaque clé `en` existe en `fr`, et un E2E change de langue sur le hub et dans la sandbox, puis recharge la page.

Lot 6 livré ([0025](decisions/0025-health-run.md)). `pnpm registry:health --app <url>` ouvre chaque template
dans Chromium sur une instance de l'app. Il lance Run, puis les tests, et rejoue chaque exercice jusqu'à « Apply the
solution ». Un échec est relancé une fois, puis l'état est écrit dans `registry/health/<name>.json`, et
`registry:build` le met dans l'index. Les 34 templates TypeScript et JavaScript sont `healthy` ; les quatre templates
Go et Kotlin sont sautés tant que l'app n'a pas leur runtime. Le hub montre un badge sur les cartes et la page
template, un bandeau rouge `broken` sur la page et dans la sandbox, et un bandeau `deprecated` avec « Voir des
alternatives ». La liste a une facette de santé, et un template `deprecated` quitte l'accueil. Le critère a été joué
sur le build de production : `strategy-ts` épinglé sur un commit jetable dont le Run plante passe `broken` et affiche
ses bandeaux, puis redevient `healthy` une fois le pin rétabli. Un tel commit passe V9, puisque ses tests restent
verts : c'est ce que le run de santé ajoute à l'indexation. L'E2E de production lance la sonde sur `strategy-ts`, puis
sur un exercice et un template introuvables.

Lot 7 prêt, publication en attente. `registry-tools` lit un dépôt de templates depuis un clone local (`--checkout`).
L'extraction de `templates/` et `registry/` en dépôts, leurs workflows et la branche qui les branche en sous-modules
sont préparés en local, gate vert, sans rien publier. La publication attend la recherche de marques (R6), l'organisation
`typika` sur GitHub et la réservation de `typika.dev`. Le critère de fin du M3 passe par ce registre public : le M3
reste ouvert jusque-là. Rien ne bloque le M4, qui garde les templates dans ce dépôt. Un template modifié d'ici là se
reporte en relançant l'extraction et en rebasant la branche.

## M4 — Go & comparaison

**Objectif** : la deuxième langue et la comparaison, cœur de la leçon « le langage fait partie du pattern ».

Livrables :

- `packages/runtime-go` : toolchain Go en WASM et pilote de build ([0018](decisions/0018-go-runtime.md)).
- Variantes Go prévues au catalogue.
- Mode comparaison : deux variantes côte à côte, synchronisées par étape de tour.

Terminé quand : on compare Strategy en TS et en Go étape par étape, et la variante Go montre pourquoi le pattern s'y
réduit à une fonction.

### Découpage

Un lot = une branche `m4/<lot>` et une PR. Les lots 1 et 2 amènent le runtime `go` : d'abord le pilote de build, testé
contre `go test` natif, puis son intégration dans l'app. Le lot 3 n'a pas besoin du runtime : la comparaison montre
du code en lecture seule et un tour, et `strategy-go` existe déjà. Le lot 4 écrit les variantes Go du catalogue en
s'appuyant sur les trois premiers.

| # | Lot | Contenu | Terminé quand |
|---|---|---|---|
| 1 | `runtime-go-driver` | `packages/runtime-go` ([0018](decisions/0018-go-runtime.md)) : un script reconstruit les assets depuis la version de Go épinglée (`compile.wasm`, `link.wasm`, stdlib précompilée, licence BSD). Le pilote fait le travail de `go build` et `go test` : graphe des packages, `importcfg`, `_testmain.go`, cache des archives par hash, conversion `test2json` vers les `TestEvent` ([runtimes](specs/runtimes.md)). Une suite de conformité compare ses résultats à ceux de `go test` natif. Un import hors du jeu précompilé a son code d'erreur, et `template-check` lance les tests des templates Go. | Sur `strategy-go` et les quatre états de ses exercices, la suite de conformité donne les mêmes verts, rouges, messages et `fichier:ligne` que `go test`. Les assets pèsent au plus 12 Mo en brotli. |
| 2 | `runtime-go-app` | Le runtime `go` dans l'app : worker, barre de progression du premier chargement, cache des assets par Service Worker (R3, une ADR), arrêt d'une boucle infinie et relance, erreurs de compilation situées dans l'éditeur, coloration Go. Le run de santé couvre les templates Go. | `/play/strategy-go` lance Run, les tests et les deux exercices dans Chromium et WebKit. Un rechargement ne retélécharge pas les assets. `strategy-go` et `strategy-base-go` sont `healthy`. |
| 3 | `compare` | Module `compare` et page `/compare/<name>?a=<lang>&b=<lang>` ([ui §9](specs/ui.md), [manifest §5.3](specs/manifest.md)) : deux colonnes en lecture seule, un tour commun synchronisé par id d'étape, colonne grisée avec le texte de la variante quand une étape manque d'un côté, `Alt+←` / `Alt+→`, une colonne à la fois avec bascule sur mobile, « Ouvrir dans la sandbox » par colonne. Le bouton « Comparer » de la page template s'active. Le lot tranche entre `/compare/<name>` et le `/compare?left=…&right=…` d'`architecture.md`. | Un E2E compare `strategy` en TS et en Go étape par étape : chaque étape ouvre dans les deux colonnes la plage qu'elle ancre. Une étape absente d'un côté affiche son état. |
| 4 | `catalogue-go` | Les variantes Go prévues au [catalogue](specs/catalogue.md), avec leurs bases, une PR par concept et par vague. (a) Fondamentaux et principes : `composition-over-inheritance-go`, `interface-segregation-go`, `dependency-inversion-go`. (b) Design patterns : `decorator-go`, `adapter-go`. (c) Architectures : `naive-crud-go`, puis `hexagonal-go`, `cqrs-go` et `outbox-go`. Chaque tour reprend les ids de la variante TS. Le guide d'écriture reçoit une section Go. | Les 9 variantes Go sont au registre, `healthy`, et se comparent à leur variante TS sans `W_TOUR_ORDER_DIVERGES`. |

Le critère de fin du M4 est joué à la fin du lot 3. Firefox et Safari (R2, R7) se vérifient à la main pendant la revue
du M4.

État (2026-10-12) : lot 1 livré. `packages/runtime-go` reconstruit les assets avec le Go local
(`pnpm --filter @typika/runtime-go build:assets`) : 11,9 Mo en brotli avec Go 1.24.5, dont une stdlib de 76 packages.
`regexp` en est sorti pour tenir sous 12 Mo : `-test.run` cherche donc une sous-chaîne. Le pilote tourne sur un FS en
mémoire branché sous l'API qu'attend `wasm_exec.js`, compile et linke chaque package avec un cache par hash, génère le
`_testmain.go`, et convertit la sortie avec un portage de `test2json`. La suite de conformité compare ses événements à
ceux de `go test -json` natif : sous-tests, tests externes avec `TestMain`, goroutines, panic, `TestMain` qui sort,
erreurs de compilation, et `strategy-go` avec sa base, le `run` et les quatre états de ses exercices. Les verts, les
rouges, les messages, les `fichier:ligne` et les sorties sont identiques. Sous Node, `strategy-go` passe ses tests en
0,65 s, puis en 0,12 s avec le cache. `template-check` lance les exercices Go et refuse un import hors du jeu
(`E_GO_IMPORT_UNAVAILABLE`). `registry-tools` ne le fait pas encore : il tourne dans le build de l'app, qui n'aura les
assets Go qu'au lot 2.

État (2026-10-12) : lot 2 livré. `/play/strategy-go` exécute Run, les tests et les deux exercices dans Chromium et
WebKit. Le runtime tourne dans un worker gardé pour la session ; Arrêter ou le watchdog le termine, et le run suivant
en recrée un. La barre d'outils montre le téléchargement des assets et un bouton Arrêter. Une erreur de build est
soulignée dans l'éditeur, et les fichiers `.go` sont colorés. Les assets sont construits dans l'image Docker, servis en
brotli et gardés en Cache Storage plutôt que par un Service Worker ([0027](decisions/0027-go-assets-delivery.md)) : un
rechargement ne les retélécharge pas. Le language service TypeScript ne démarre plus pour un template Go.
`registry-tools` lance les exercices Go à l'indexation (V9, V11), et `strategy-go` comme `strategy-base-go` sont
`healthy`.

État (2026-10-12) : lot 3 livré. `/compare/<name>?a=<langage>&b=<langage>` est retenu plutôt que le
`/compare?left=…&right=…` d'`architecture.md`, mis à jour : il suit [ui §9](specs/ui.md) et garde le nom du concept
dans l'URL. Le module `compare` charge les deux variantes depuis l'index et les fichiers du registre, aligne les tours
par id d'étape, et réutilise l'éditeur en lecture seule, les onglets et la navigation du tour (`Alt+←` / `Alt+→`,
`#step=`). Une étape absente d'un côté grise la colonne avec « Cette étape n'a pas d'équivalent en <langage> ». La
page template propose « Comparer avec <langage> » pour chaque variante de l'index ; `strategy-kotlin` y figure, et se
compare donc déjà en lecture seule avant son runtime (M6). L'E2E parcourt Strategy en TS et en Go étape par étape et
vérifie la plage ouverte dans chaque colonne. Aucun template ne manque encore d'étape : l'E2E retire une étape du
manifeste Go à la volée pour couvrir ce cas.

État (2026-10-12) : lot 4, vague (a) livrée. `composition-over-inheritance-go`, `interface-segregation-go` et
`dependency-inversion-go` sont au registre avec leurs bases, `healthy`, et se comparent à leur variante TS sans
`W_TOUR_ORDER_DIVERGES` (#46, #47, #48). La base de composition chaîne des structs embarqués derrière une interface
`Product`, et son tour montre que l'embedding promeut des méthodes sans créer de sous-type ni de liaison tardive. Dans
l'ISP, `payments` ne déclare plus aucune interface : chaque client déclare la sienne, d'une méthode. Dans le DIP,
`checkout` déclare `Notifier` et `OrderRepository` et `memstore` importe `checkout`. L'exercice du DIP révèle une
contrainte propre à Go : un test qui appelle une API absente de la base ne compile pas, donc `start/` déclare cette
API avec un corps qui ignore ses arguments. Le guide d'écriture l'ajoute à sa section Go (§8.3).

État (2026-10-12) : lot 4, vague (b) livrée. `decorator-go` et `adapter-go` sont au registre avec leurs bases,
`healthy`, et se comparent à leur variante TS sans `W_TOUR_ORDER_DIVERGES` (#51, #52). Les décorateurs Go sont des
structs qui embarquent le `Notifier` qu'ils enveloppent, comme un middleware `http.Handler` ; le tour explique ce que
l'embedding transmet, et le risque d'une méthode transmise sans le comportement du décorateur. L'adapter Go satisfait
`payments.Gateway` implicitement, vérifié par `var _ Gateway = (*LegacyPayAdapter)(nil)`. Le SDK simulé vit dans
`internal/legacypay`, pas sous `vendor/`. Les tests qui espionnaient le SDK en TS vérifient ce qu'il détient. Les deux
exercices `refactor` appliquent la règle Go du guide : `start/` déclare l'API nouvelle avec un corps sans effet.

État (2026-10-12) : lot 4, vague (c) livrée, lot 4 terminé. `naive-crud-go`, `hexagonal-go`, `cqrs-go` et `outbox-go`
sont au registre, `healthy`, et se comparent à leur variante TS sans `W_TOUR_ORDER_DIVERGES` (#55, #56, #57) : les 9
variantes Go du catalogue y sont. `net/http` n'étant pas dans le jeu précompilé, la base simule le HTTP avec des corps
JSON. Dans `hexagonal-go`, le cœur déclare ses ports pilotés et `*Service` est le port pilote : chaque adapter pilote
déclare l'interface qu'il appelle. Dans `cqrs-go`, une commande est une struct traitée par une méthode, sans bus, et
les read models sont des maps. Dans `outbox-go`, le relais publie après chaque écriture et `Run` le relance dans une
goroutine arrêtée par un `context`. Reste la revue du M4, avec Firefox et Safari vérifiés à la main.

Revue (2026-10-12) : le M4 est livré. Le runtime `go` compile et teste dans le navigateur, avec des résultats
identiques à `go test` natif. Les 9 variantes Go du catalogue sont au registre, `healthy`, et se comparent étape par
étape à leur variante TS. Strategy en TS et en Go joue le critère de fin. L'index compte 52 entrées. Le contrôle
complet est vert, avec 70 E2E en dev et 35 en production. Le runtime Go est couvert dans Chromium et dans le WebKit de
Playwright, et Safari est vérifié à la main sur le build de production. On passe au M6 plutôt qu'au M5 : le M6 se construit en local comme le M4, alors que le
gist, `npx typika create` et l'embed dans une page tierce supposent un déploiement public, bloqué comme le lot 7 du M3.
Ce qui reste ouvert :

- Firefox n'est pas vérifié (R2, R7, R8). Le Firefox de Playwright (build 1555) ne démarre pas sous macOS 27, même en
  mode fenêtré, et aucun Firefox n'est installé sur le poste de développement. La vérification passe au M6, qui
  ajoute un runtime de plus.
- Le M3 reste ouvert : la publication attend la recherche de marques (R6), l'organisation `typika` et `typika.dev`.
- La configuration Vercel, `SECURITY.md` et la CI GitHub sont toujours en attente. Le service Kotlin les rend plus
  pressants : c'est le premier composant qui exécute un compilateur sur du code non fiable.

## M5 — Partage

**Objectif** : sortir les templates de Typika.

Livrables — voir [sharing-and-cli](specs/sharing-and-cli.md) :

- Embed `/embed/<name>` et snippet copiable.
- Partage par URL, partage par gist (GitHub OAuth).
- Export zip, push vers un nouveau dépôt GitHub.
- CLI `typika create` et `typika validate`.

Terminé quand : un template est embarqué dans une page tierce et exécutable, et `npx typika create strategy-ts`
produit un projet qui passe ses tests hors de Typika.

### Découpage

Un lot = une branche `m5/<lot>` et une PR. Tant que la publication attend #92, il n'y a pas d'instance publique ni de
package npm : les lots 1 à 5 se construisent et se testent en local, comme le M4 et le M6. Une page tierce se simule
avec un hôte servi sur une autre origine, comme au spike R2. Aujourd'hui, un projet local correspond à un template ou à
un exercice. Le partage demande des projets indépendants : le lot 1 les apporte.

| # | Lot | Contenu | Terminé quand |
|---|---|---|---|
| 1 | `local-projects` | Projets locaux ([sharing-and-cli §1](specs/sharing-and-cli.md), [ui §11](specs/ui.md)) : plusieurs projets par template, chacun ouvert par son id. Routes `/p/<projectId>` et `/projects` : liste, ouverture, renommage, duplication, suppression, indicateur d'espace, avertissement au-delà de 80 % du quota, `navigator.storage.persist()` au premier projet créé. | Une copie s'ouvre par `/p/<id>`, garde ses modifications à part de son original après un rechargement, et sa suppression depuis `/projects` la retire. |
| 2 | `share-url` | `projects.origin` gagne `share-url`, avec une migration IndexedDB testée si le schéma l'exige. Partage par URL `/s#<payload>` ([sharing-and-cli §2](specs/sharing-and-cli.md), [ui §12](specs/ui.md)) : codec versionné (delta contre l'origine épinglée, sinon fichiers complets), seuil de 8 000 caractères avec la raison affichée, bouton Partager dans la sandbox. L'ouverture se fait dans une sandbox éphémère, avec un bandeau d'origine, et devient un projet local à la première modification ou sur « Enregistrer dans mes projets ». Un payload invalide ou d'une version inconnue affiche un écran d'erreur. | Un E2E partage un projet modifié, ouvre le lien dans un contexte neuf et retrouve les mêmes fichiers. Un projet au-delà du seuil n'a pas de lien. Le codec relit chaque version qu'il a émise. |
| 3 | `export-zip` | Export zip depuis la sandbox et `/projects` ([sharing-and-cli §4](specs/sharing-and-cli.md)), avec l'option « sans les fichiers Typika ». La règle de retrait (§6.4) vit dans `@typika/manifest`, pour que le CLI la reprenne. | Le zip de `strategy-ts`, de `strategy-go` et de `strategy-kotlin`, extrait, passe ses tests avec l'outil natif du langage, avec et sans les fichiers Typika. |
| 4 | `embed` | `/embed/<name>` ([ui §13](specs/ui.md), [security §3.6](specs/security.md), [0016](decisions/0016-isolation-and-embed.md)) : éditeur et sortie, paramètres d'URL, runtime démarré à la première interaction, `postMessage` validé par schéma, aucune persistance locale, `frame-ancestors` ouvert sur `/embed/*` seulement. « Ouvrir dans Typika » passe l'état courant par un lien du lot 2. Le snippet se copie depuis la page template. Le lot tranche, dans une ADR, quels runtimes tournent en embed : Go n'utilise pas `SharedArrayBuffer`, et Kotlin compile par le relais de l'app. | Un E2E sur le build de production embarque `strategy-ts` dans une page servie sur une autre origine, lance les tests et reçoit `typika:test-result`. Chaque autre route garde `frame-ancestors 'none'`. |
| 5 | `cli` | `packages/cli`, package `typika` ([sharing-and-cli §6-7](specs/sharing-and-cli.md)) : `typika create` (nom ou ref, `--variant`, `--exercise`, `--keep-tour`, `--registry`, `--force`, `--json`, codes de sortie) et `typika validate` (`--run` s'appuie sur les runners de `template-check`). Les tests passent par un registre servi en local, archives comprises, puisque le dépôt est privé. Le package n'est pas publié sur npm. | `typika create strategy-ts`, lancé contre le registre local, produit un projet qui passe ses tests hors de Typika, et de même pour les variantes Go et Kotlin. `typika validate` signale un template volontairement cassé avec le code `5`. |
| 6 | `github` | Partage par gist (`/g/<gistId>`) et push vers un nouveau dépôt ([sharing-and-cli §3, §5](specs/sharing-and-cli.md)) : endpoint d'échange OAuth sur le serveur de l'app, jeton en `sessionStorage`, scopes demandés au moment de l'action. Il demande une OAuth App GitHub : celle de développement se crée sur le compte du mainteneur, celle de production avec l'organisation (#92). | Un gist secret créé depuis la sandbox se rouvre par `/g/<id>` sans connexion. Un push crée un dépôt dont le `typika.toml` garde `parent`. |

Le critère de fin se joue en deux temps. L'embed dans une page tierce est joué au lot 4, et `typika create` contre le
registre local au lot 5. `npx typika create` contre l'instance publique attend la publication du package et du
registre (#92).

État (2026-10-19) : lot 1 livré. Un template peut avoir plusieurs projets locaux : `/p/<id>` ouvre l'un d'eux dans la
sandbox, et ses modifications, son reset et l'application d'une solution ne touchent que lui. `/play/<name>` rouvre
toujours le plus récent. `/projects` liste les projets avec leur template, leur langage, leur exercice et leur date,
et permet de les ouvrir, de les renommer, de les dupliquer et de les supprimer après confirmation. La page affiche
l'espace utilisé, et avertit au-delà de 80 % du quota. « Reprendre », sur l'accueil, ouvre maintenant `/p/<id>`. Le
schéma IndexedDB n'a pas changé : la migration passe au lot 2, avec l'origine `share-url`.

Lot 2 livré : le bouton Partager de la sandbox crée un lien `/s#1.<payload>`, qui porte la ref épinglée du template
et le delta des fichiers, compressé en `deflate-raw`, ou explique qu'un projet est trop volumineux au-delà de 8 000
caractères. Le lien s'ouvre dans une sandbox éphémère, avec un bandeau qui renvoie au template. Le projet est
enregistré à la première modification ou sur demande, sous un id dérivé du payload : rouvrir le lien rouvre la copie
enregistrée. Un lien d'exercice porte le nom de l'exercice (`x`, ajouté au format). Un payload invalide, plus récent ou
dont le template est introuvable a son message et un retour aux templates. L'origine `share-url` n'a pas demandé de
migration, puisque les enregistrements IndexedDB ne sont pas typés par la base. Un lien sans origine (`f` seul) n'est
pas encore ouvert : il attend les projets `blank` ([sharing-and-cli §2](specs/sharing-and-cli.md)).

Lot 3 livré : Exporter, dans la sandbox et dans `/projects`, télécharge le projet en zip, avec ou sans les fichiers
Typika (`typika.toml`, `tour/`). Avec eux, `typika.toml` reçoit `parent`, la ref épinglée du template. La règle de
retrait est `withoutTypikaFiles` de `@typika/manifest`. Les zips de `strategy-ts`, `strategy-go` et `strategy-kotlin`,
téléchargés depuis l'app et extraits, passent leurs tests avec `npm test`, `go test` et `gradle test`, avec et sans les
fichiers Typika. Cette vérification est faite à la main : le contrôle local n'a pas toutes les toolchains, et l'E2E
vérifie le contenu des zips.

Lot 4 livré : `/embed/<name>` affiche l'éditeur, la sortie et une barre réduite (fichier, Exécuter, Tests, « Ouvrir
dans Typika »). L'[ADR 0031](decisions/0031-embed-runtimes.md) y fait tourner les trois runtimes. Le runtime ne
démarre qu'au premier clic, ou au chargement avec `run=auto`, sauf pour Go. Le language service ne démarre qu'au premier
focus dans l'éditeur. Sous une page hôte qui n'est pas un contexte sécurisé, l'embed n'exécute rien et dit pourquoi.
Les paramètres `file`, `lines`, `tour-step`, `panel`, `readonly`, `run`, `theme` et `lang` sont lus ; `panel=preview`
retombe sur la console, faute de preview en V1. L'embed n'ouvre ni n'écrit aucun projet local, et le cache des
compilations Kotlin y reste en mémoire. Les messages `typika:ready`, `typika:resize` et `typika:test-result` partent
vers la page hôte, et `typika:goto-step` et `typika:set-theme` sont validés par schéma ; tout autre message est ignoré.
« Ouvrir dans Typika » porte l'état courant par un lien `/s#…` du lot 2, ou ouvre `/play/<name>` au-delà du seuil. Le
thème suit `data-theme` sur la racine, et `prefers-color-scheme` sans lui. Seul `/embed/*` a `frame-ancestors *`. La
page template copie le snippet d'embed. L'E2E de production embarque `strategy-ts` dans une page d'un autre site, lance
les tests et reçoit `typika:test-result` ; en dev, Go et Kotlin tournent aussi en embed.

Lot 5 livré : `packages/cli` contient le package `typika`, qui n'est pas publié. `typika create` résout un nom dans
l'index ou une ref `github:`, puis télécharge l'archive de la ref épinglée et l'extrait
([0032](decisions/0032-cli-archives-and-validate.md)). Il valide le manifeste et écrit le projet sans les fichiers
Typika, puis affiche les prochaines étapes. Il gère `--variant`, `--exercise` (état initial, énoncé dans
`EXERCISE.md`), `--keep-tour`, `--force`, `--json`, `--registry` et `--archive-url`, ainsi que les codes de sortie de
0 à 7. `typika validate` applique les contrôles du manifeste et du workspace, avec les topics de l'index, et compare
l'ordre du tour à la variante TypeScript. Avec `--run`, il fait tourner les tests et les exercices dans les runners de
`template-check`, et sort avec `5` dès qu'il trouve une erreur. Les tests du package passent par un registre local
qui sert l'index et des archives `git archive`. Les projets `strategy-ts`, `strategy-go` et `strategy-kotlin`, créés
par le CLI, passent leurs tests avec `npm test`, `go test` et `gradle test`. Cette vérification est faite à la main.

## M6 — Kotlin

**Objectif** : le langage POO de référence du catalogue.

Livrables :

- `services/kotlin-compiler` : service maison sur `kotlin-compiler-embeddable`, cible JS ([0019](decisions/0019-kotlin-runtime.md)), avec
  limites et rate limiting — voir [security](specs/security.md).
- `packages/runtime-kotlin`.
- Variantes Kotlin des 16 concepts.

Terminé quand : les 16 concepts sont comparables TS / Kotlin, et le service de compilation tient une charge de test
sans dépasser ses limites.

### Découpage

Un lot = une branche `m6/<lot>` et une PR. Le M6 suit le M4 : d'abord le service et le runtime, testés hors de l'app,
puis leur intégration, puis le catalogue. `strategy-kotlin` et `strategy-base-kotlin` existent depuis le spike R8 et
servent de référence aux trois premiers lots. Tout tourne en local avec Docker, sans déploiement public.

| # | Lot | Contenu | Terminé quand |
|---|---|---|---|
| 1 | `kotlin-compiler` | `services/kotlin-compiler` ([0019](decisions/0019-kotlin-runtime.md), [runtimes §6.4](specs/runtimes.md)) : serveur HTTP minimal sur `kotlin-compiler-embeddable`, protocole 1 (`POST /compile`), compilation en deux phases vers un module ES avec source map, stdlib et `kotlin.test` comme seules bibliothèques, compilation de chauffe au démarrage. Limites de [hosting](guides/hosting.md) : corps, concurrence, file, cache mémoire, timeout. Le lot tranche comment interrompre une compilation (processus séparé ou redémarrage du conteneur), dans une ADR. Image durcie de [security §3.3](specs/security.md) : non-root, FS en lecture seule, aucun réseau sortant, logs sans corps. Tests HTTP (Vitest) contre le conteneur. | `strategy-kotlin` et les quatre états de ses exercices compilent. Une erreur répond avec ses diagnostics `fichier:ligne:colonne`. Un corps trop gros reçoit `413`, une file pleine `503`, une compilation qui dépasse le timeout est interrompue sans bloquer les suivantes. |
| 2 | `runtime-kotlin` | `packages/runtime-kotlin` : client du protocole avec ses erreurs (`429`, `503`, réseau), cache par hash, harness `kotlin.test` (`describe` / `it` / `xit`) qui émet les `TestEvent`, `location` tirée de la source map, `println` capturé en `Stdout`. Une suite de conformité compare ses résultats à ceux de `gradle test` sur JVM. `template-check` lance les templates Kotlin contre le service. | Sur `strategy-kotlin` et les quatre états de ses exercices, la suite de conformité donne les mêmes verts, rouges, messages et `fichier:ligne` que `gradle test`. |
| 3 | `runtime-kotlin-app` | Le runtime `kotlin` dans l'app : `KOTLIN_COMPILER_URL`, templates Kotlin masqués quand il manque, toasts `429` / `503`, diagnostics du dernier run dans l'éditeur, coloration Kotlin, cache client en IndexedDB, CSP `connect-src`. Profil Docker `kotlin` sur un réseau interne, `/api/kotlin/*` routé par Caddy, rate limiting par IP (R9, une ADR). Le run de santé et `registry-tools` (V9) couvrent Kotlin. Un test de charge mesure le service derrière Caddy. | `/play/strategy-kotlin` lance Run, les tests et les deux exercices dans Chromium et WebKit. Sans service, le hub masque Kotlin. Le test de charge reste dans les limites (`429` / `503` au-delà, aucun crash ni dépassement mémoire). `strategy-kotlin` et sa base sont `healthy`. |
| 4 | `kotlin-artifacts` | Artefacts précompilés ([runtimes §6.4](specs/runtimes.md)) : `registry-tools` compile chaque template Kotlin à l'indexation et publie l'artefact avec l'index. Le runtime l'utilise tant que le projet n'est pas modifié. | Ouvrir `strategy-kotlin` et lancer ses tests ne fait aucun appel au service. Après une modification, le run suivant le rappelle. |
| 5 | `catalogue-kotlin` | Les 15 variantes Kotlin restantes du [catalogue](specs/catalogue.md), avec leurs bases, une PR par concept et une PR de registre par vague. (a) Fondamentaux et principes : `composition-over-inheritance-kotlin`, `single-responsibility-kotlin`, `open-closed-kotlin`, `liskov-substitution-kotlin`, `interface-segregation-kotlin`, `dependency-inversion-kotlin`. (b) Design patterns : `observer-kotlin`, `decorator-kotlin`, `factory-method-kotlin`, `adapter-kotlin`. (c) Architectures : `naive-crud-kotlin`, puis `hexagonal-kotlin`, `cqrs-kotlin`, `event-sourcing-kotlin`, `outbox-kotlin` et `state-machine-kotlin`. Chaque tour reprend les ids de la variante TS. Le guide d'écriture complète sa section Kotlin. | Les 16 variantes Kotlin sont au registre, `healthy`, et se comparent à leur variante TS sans `W_TOUR_ORDER_DIVERGES`. |

Le critère de fin du M6 est joué à la fin du lot 5, le test de charge au lot 3. Firefox (R2, R7, R8) se vérifie
pendant la revue du M6, à la main ou avec un Playwright qui le lance.

État (2026-10-13) : lot 1 livré. `services/kotlin-compiler` compile avec Kotlin 2.4.21 dans une image JRE 25, non-root,
qui tourne sur un FS en lecture seule avec un `tmpfs` pour `/tmp`. Le superviseur HTTP confie chaque compilation à un
processus de compilation chaud, et le tue au timeout ([0028](decisions/0028-kotlin-compilation-workers.md)) : une
compilation piégée reçoit `504` pendant que l'autre processus continue de compiler. Un processus à court de mémoire
fait répondre `503`, puis il est relancé. Sur 2 vCPU et 1 Gio, `strategy-kotlin` compile en 0,7 s seul et à 2,4
compilations par seconde sous charge, avec un pic à 815 Mio. Le cache mémoire passe à 32 Mio par défaut. Une suite
Vitest lance l'image en conteneur durci : `strategy-kotlin` et les quatre états de ses exercices compilent, les
diagnostics sont en `fichier:ligne:colonne`, et `400`, `405`, `413`, `503` (file pleine, crash), `504`, CORS, cache et
logs sans sources sont couverts. La suite demande Docker. Le réseau interne sans accès sortant arrive avec le profil
Compose du lot 3.

Lot 2 livré : `packages/runtime-kotlin` compile par le service (client du protocole, erreurs `429`, `503`, `504` et
réseau, cache LRU en mémoire par hash en attendant IndexedDB au lot 3), puis exécute l'artefact dans un worker neuf
par run, ou dans un contexte `node:vm` hors navigateur. Le harness `kotlin.test` émet les `TestEvent` par fichier,
situe chaque échec sur la ligne du test par la source map et capture `println`. La suite de conformité compare
`strategy-kotlin`, sa base, les quatre états de ses exercices et des fixtures (exceptions, `@Ignore`, package par
défaut, chaque assertion, erreurs de compilation) à `gradle test`, et `main` à `gradle run` : mêmes verts, rouges,
`fichier:ligne` et messages, une fois traduits les quatre messages que JUnit 5 formule autrement (§6.4 de
[runtimes](specs/runtimes.md)). `template-check` lance les exercices Kotlin quand `KOTLIN_COMPILER_URL` est défini.
Les tests du navigateur passent dans Chromium et WebKit.

Lot 3 en trois PR : (a) l'intégration dans l'app, (b) le déploiement (profil Compose, test de charge), (c) le run
de santé et `registry-tools`. (a) livré : la frame demande chaque compilation à l'app par son `MessagePort`, l'app
compile avec un cache IndexedDB et appelle `/api/kotlin/compile` sur sa propre origine. Son serveur relaie vers
`KOTLIN_COMPILER_URL` avec un rate limiting par IP ([0029](decisions/0029-kotlin-relay-rate-limit.md)), en dev comme
en production ; Caddy n'a pas de route vers le service, contrairement à ce que prévoyait ce lot. La sandbox colore
Kotlin, souligne les erreurs du dernier run, explique un compilateur saturé (`429`) ou indisponible, et un runtime
absent de l'instance. Sans service, le hub masque Kotlin une fois hydraté. L'E2E de dev lance le service et passe
`/play/strategy-kotlin` (Run, tests, erreur de compilation, cache après rechargement, les deux exercices) dans
Chromium et WebKit.

(b) livré : le profil Compose `kotlin` lance le service sur un réseau `internal`, avec les protections de
[security §3.3](specs/security.md). `web` est le seul autre membre de ce réseau, et Compose lui fixe
`TYPIKA_TRUST_PROXY=true`. Un `X-Forwarded-For` forgé ne contourne pas la limite, puisque Caddy le remplace.
`.env.example` liste les variables Kotlin. Un processus planté répond `503` avec `Retry-After`, comme une file
pleine, et le relais en fait autant quand le service ne répond pas en 25 s. Le hub ne montre plus Kotlin pour le
masquer ensuite : il reste masqué tant que la config n'a pas confirmé le service, prérendu compris. Le test de
charge (`load-test.ts`, [hosting §4.5](guides/hosting.md)) passe derrière Caddy :

- une rafale de 30 requêtes d'un même client reçoit 10 `200` et 20 `429` avec `Retry-After` ;
- la limite levée, 60 compilations simultanées et deux compilations piégées donnent 10 `200`, 50 `503` avec
  `Retry-After` et deux `504` ;
- le pic mémoire atteint 829 Mio sur 1 Gio, sans redémarrage ni arrêt pour mémoire, et le service compile de nouveau
  après la charge.

Ce test joue le cas de [0028](decisions/0028-kotlin-compilation-workers.md) : les deux places restent bloquées par les
compilations piégées pendant environ 18 s. La suite E2E Kotlin passe sur le build de production derrière Caddy, dans
WebKit comme dans Chromium, une fois la limite par IP levée : sinon, la suite seule la dépasse.

(c) livré : `registry-tools build` et `health` lancent les exercices Kotlin (V9) quand `KOTLIN_COMPILER_URL` est
défini, comme `template-check`. Le build de l'app ne les lance pas, puisqu'il ne dépend pas du service. Le run de santé
lit `/config.json` de l'instance visée et sonde Kotlin seulement si elle a un compilateur : sinon, les templates
Kotlin restent sautés plutôt que `broken`. Sur le build de production relié au service, `strategy-kotlin` et
`strategy-base-kotlin` sont `healthy`. Le run, V9 compris, demande onze compilations au service et tient sous la
limite par IP ; pour les 16 templates du lot 5, il faudra la lever sur l'instance sondée. Le lot 3 est livré.

Lot 4 en deux PR : (a) la compilation des artefacts dans `registry-tools`, (b) leur usage dans l'app. (a) livré : avec
`KOTLIN_COMPILER_URL`, `registry-tools build` compile chaque template Kotlin en modes `test` et `run`, tel que la
sandbox l'ouvre (sans `exercises/`). Il écrit chaque compilation dans `registry/artifacts/kotlin/<clé>.json`, sous la
clé du cache client ([runtimes §6.4](specs/runtimes.md)), et supprime les artefacts qu'aucun template ne demande plus.
Un template qui ne compile pas fait échouer le build ; sans service, le build signale les artefacts manquants ou
périmés. Ceux de `strategy-kotlin` et de sa base sont commités : 100 à 220 Ko chacun, 18 à 37 Ko compressés, et deux
builds successifs écrivent les mêmes fichiers.

(b) livré : l'app cherche chaque compilation dans son cache IndexedDB, puis dans `artifacts/kotlin/<clé>.json` à côté
de l'index du registre, en lecture seule ; un artefact absent ou illisible compte comme absent du cache. Le plugin Vite
`registry-index` sert ces artefacts en dev et les émet au build, et le serveur de production les sert comme immuables,
avec un `404` pour un artefact absent. L'E2E de dev ouvre `strategy-kotlin`, lance ses tests et `main` sans aucun appel
à `/api/kotlin/compile`, puis l'appelle une fois après une modification. Sur le build de production, Chromium et WebKit
ne font aucun appel. Les exercices ne sont pas précompilés : leur état de départ passe par le service. Le lot 4 est
livré.

État (2026-10-15) : lot 5, vague (a) livrée. `composition-over-inheritance-kotlin`, `single-responsibility-kotlin`,
`open-closed-kotlin`, `liskov-substitution-kotlin`, `interface-segregation-kotlin` et `dependency-inversion-kotlin`
sont au registre avec leurs bases, `healthy` (#67 à #72), avec leurs 24 artefacts précompilés. Les six variantes TS
listent Kotlin et sont réépinglées. Chaque paire TS / Kotlin a les mêmes `id` d'étapes dans le même ordre, et la
comparaison s'aligne étape par étape dans le navigateur. Depuis, `template-check` et `registry-tools` émettent
`W_TOUR_ORDER_DIVERGES` ([manifest §5.3](specs/manifest.md)) : une variante qui ne présente pas les étapes partagées
avec sa référence TypeScript dans le même ordre est signalée, et aucun template du registre ne l'est.
Les tours s'appuient sur ce que Kotlin rend explicite : `open` pour hériter, `by` pour déléguer, des fonctions de
premier niveau sans état, des `fun interface` dont un faux de test est une lambda, et un constructeur primaire qui
injecte en une ligne. Le LSP écrit ses tests de contrat comme une classe de test abstraite dont hérite la classe de
test de chaque sous-type. Le hub en dev liste 35 templates ; en production sans service, Kotlin reste masqué.

État (2026-10-15) : lot 5, vague (b) livrée. `observer-kotlin`, `decorator-kotlin`, `factory-method-kotlin` et
`adapter-kotlin` sont au registre avec leurs bases, `healthy` (#76 à #79), avec leurs 16 artefacts précompilés.
`observer-ts`, `decorator-ts`, `factory-method-ts`, `adapter-ts` et `adapter-go` listent Kotlin et sont réépinglés.
Aucun template n'émet `W_TOUR_ORDER_DIVERGES`. Les abonnés de l'Observer sont des lambdas derrière une
`fun interface`, et `subscribe` rend une fonction de désabonnement. Les décorateurs délèguent avec `: Notifier by
inner` et n'écrivent que la méthode qu'ils changent. Le créateur du Factory Method garde un `ship` final par défaut,
avec un `object` par colis. L'Adapter traduit des codes `Int` ouverts en un résultat `sealed`, et son tour explique
pourquoi une extension function ne remplace pas la classe. Sans bibliothèque de mock, les SDK simulés exposent une
recherche (`findPayment`, `findCharge`) pour que les tests vérifient ce qui a été envoyé. Le hub en dev liste 39
templates.

État (2026-10-16) : lot 5, vague (c) livrée. `naive-crud-kotlin`, la base commune, `hexagonal-kotlin`, `cqrs-kotlin`,
`event-sourcing-kotlin`, `outbox-kotlin` et `state-machine-kotlin` sont au registre, `healthy` (#82 à #86), avec leurs
12 artefacts précompilés. `hexagonal-ts`, `hexagonal-go`, `cqrs-ts`, `cqrs-go`, `event-sourcing-ts`, `outbox-ts`,
`outbox-go` et `state-machine-ts` listent Kotlin et sont réépinglés. Les corps HTTP sont des `Map<String, Any?>` ; sur
Kotlin/JS, `0.5 as? Int` réussit, d'où `wholeNumber` pour lire un entier. Les commandes, les changements et les
événements sont des hiérarchies `sealed`, que `decide` et `evolve` parcourent avec des `when` exhaustifs ; la
réhydratation est un `fold`. Le relais de l'outbox est synchrone et piloté par les tests. La machine à états est une
`sealed class` dont la table de transitions est un `when` exhaustif : un état oublié ne compile pas. Le hub en dev liste
44 templates.

Revue (2026-10-19) : le M6 est livré. Les 16 concepts du catalogue ont leur variante Kotlin au registre, et se
comparent étape par étape à leur variante TS sans `W_TOUR_ORDER_DIVERGES`. L'index compte 78 entrées, dont 28 Kotlin,
toutes `healthy`. Le service de compilation a tenu son test de charge au lot 3. Les suites de la revue sont fermées
(#88 à #98) : `registry:build` ne compile plus que les artefacts manquants, et l'état de départ des exercices Kotlin
est précompilé lui aussi ([0030](decisions/0030-kotlin-exercise-artifacts.md)). Ouvrir un exercice puis lancer ses
tests ou son programme n'appelle plus le service. `registry/artifacts/kotlin/` compte 101 artefacts, pour 25 Mo. Le
contrôle complet est vert, avec 88 E2E en dev. On passe au M5, en commençant par ce qui se construit sans déploiement
public : partage par URL, export zip, `/embed/<name>` et `typika validate`. Ce qui reste ouvert :

- Firefox sort du périmètre (#97) : le Firefox de Playwright ne démarre toujours pas sous macOS 27. R2, R7 et R8 sont
  vérifiés dans Chromium et WebKit, et R2 et R7 aussi à la main dans Safari.
- Le M3 reste ouvert : la publication attend la recherche de marques (R6), l'organisation `typika` et `typika.dev`
  (#92). Le gist, le push GitHub, `npx typika create` et l'embed dans une page tierce du M5 en dépendent aussi.
- Le serveur de dev s'est arrêté une fois sur un abort de V8 en envoyant un module de 25 Mo (#104). Il ne s'est pas
  reproduit.
- La configuration Vercel, `SECURITY.md` et la CI GitHub sont toujours en attente.

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
| R2 | COOP/COEP casse l'embed | Levé pour `browser-js` ([0016](decisions/0016-isolation-and-embed.md)) ; Safari vérifié, Firefox hors périmètre |
| R3 | Poids des runtimes | Lazy-load, Cache Storage ([0027](decisions/0027-go-assets-delivery.md)), CDN plus tard — M1 / M4 |
| R4 | IntelliSense TS dans CodeMirror 6 | Levé : CodeMirror 6 confirmé ([0015](decisions/0015-editor.md)) |
| R5 | Pourrissement des templates | CI de santé + Renovate — M3 |
| R6 | Nom du projet | Typika retenu ([0014](decisions/0014-name-typika.md)) ; recherche de marques au M0 |
| R7 | Go dans le navigateur | Levé : toolchain Go en WASM ([0018](decisions/0018-go-runtime.md)) ; Safari vérifié, Firefox hors périmètre |
| R8 | Service de compilation Kotlin | Levé : service maison, cible JS ([0019](decisions/0019-kotlin-runtime.md)) ; WebKit vérifié, Firefox hors périmètre |
| R9 | Abus du service de compilation | Levé : limites, isolation et rate limiting par IP ([0028](decisions/0028-kotlin-compilation-workers.md), [0029](decisions/0029-kotlin-relay-rate-limit.md)), test de charge au M6 |
