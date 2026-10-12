# Interface

Statut : brouillon · 2026-10-08 · Voir aussi : [registry](registry.md), [sharing-and-cli](sharing-and-cli.md),
[runtimes](runtimes.md), [catalogue](catalogue.md)

Spécification fonctionnelle de chaque écran. Le design visuel n'est pas couvert ici.

## 1. Routes

| Route | Écran |
|---|---|
| `/` | Accueil du hub |
| `/templates` | Liste à facettes, filtres dans la query string |
| `/templates/<name>` | Page template |
| `/play/<name>` | Sandbox ouverte depuis un template (`<name>` = `name` du manifeste, ex. `strategy-ts`) |
| `/play/<name>?exercise=<id>` | Sandbox en mode exercice |
| `/play/<name>?panel=diff` | Sandbox ouverte sur le diff depuis la base |
| `/compare/<name>?a=<lang>&b=<lang>` | Comparaison de deux variantes |
| `/projects` | Mes projets locaux |
| `/p/<projectId>` | Projet local |
| `/s#<payload>` | Projet partagé par URL |
| `/g/<gistId>` | Projet partagé par gist |
| `/embed/<name>` | Embed iframe |

Les pages du hub (`/`, `/templates`, `/templates/<name>`) sont prérendues et lisibles sans JavaScript. Les autres sont
des écrans applicatifs.

## 2. États transverses

Ces états s'appliquent à tous les écrans qui chargent un template ou un runtime.

| État | Comportement |
|---|---|
| **Chargement de l'index** | Squelettes de cartes ; jamais d'écran blanc. |
| **Chargement d'un runtime lourd** (Go, Kotlin) | Barre de progression avec taille téléchargée / taille totale, nom du runtime, mention « mis en cache pour les prochaines fois ». L'éditeur est utilisable en lecture pendant le chargement ; Run et Test sont désactivés avec la raison en infobulle. |
| **Runtime indisponible** | Navigateur non compatible (pas de WASM, pas d'isolation cross-origin) ou service de compilation Kotlin désactivé : message explicite, lecture du code et du tour toujours possibles, bouton d'export. |
| **Erreur de chargement** | Message, cause lisible (réseau, ref introuvable, manifeste invalide), bouton Réessayer. |
| **Template `degraded`** | Badge orange sur carte et page ; aucune restriction. |
| **Template `broken`** | Bandeau rouge sur la page template et la sandbox : « Ce template échoue actuellement à la vérification automatique », lien vers le run CI. Ouverture possible. |
| **Template `deprecated`** | Absent des listes par défaut ; page accessible avec bandeau, bouton « Voir des alternatives » (même topic). |
| **Hors ligne** | Bandeau discret. Projets locaux et runtimes en cache utilisables ; le hub affiche le dernier index en cache. |

## 3. Accueil — `/`

Objectif : amener l'apprenant vers un concept en deux clics.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ typika            Templates   Mes projets            [🔍 Rechercher  /] │
├──────────────────────────────────────────────────────────────────────────┤
│  Apprenez l'architecture en exécutant du code.                           │
│  [ Parcourir les templates ]                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ Architecture                                                  Tout voir →│
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│ │ Hexagonal  │ │ CQRS       │ │ Event      │ │ Outbox     │  …           │
│ │ TS Go Kt   │ │ TS Go Kt   │ │ sourcing   │ │ TS Go Kt   │              │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘              │
│ Principes SOLID                                               Tout voir →│
│ [SRP] [OCP] [LSP] [ISP] [DIP]                                            │
│ Design patterns          Création · Structure · Comportement Tout voir → │
│ [Strategy] [Observer] [Decorator] [Factory Method] [Adapter]             │
│ Fondamentaux POO                                                         │
│ [Composition vs héritage]                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Reprendre : strategy-ts · modifié il y a 2 h               (si projets)  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Une carte par **concept**, pas par template : elle liste les langages disponibles ; clic → page du template TS de
  référence, avec sélecteur de langage. Un concept regroupe un template et ses variantes ; la carte porte le libellé
  de son premier topic. Les sections suivent l'ordre du vocabulaire du registre.
- Chaque section mène à la liste filtrée sur sa catégorie (« Tout voir ») ou sur une de ses familles.
- « Reprendre » n'apparaît que s'il existe des projets locaux ; montre les 3 derniers. Il est lu après l'hydratation,
  la page prérendue ne le contient pas.

## 4. Liste — `/templates`

- Filtres à facettes : `topic` (arbre par catégorie puis famille), `language`, `paradigm`, `level`, `framework`,
  `library`, `useCase`, santé (`healthy`/`degraded` cochés par défaut, `broken` et `deprecated` décochés), catégorie
  `official`/`community`.
- Chaque filtre se reflète dans la query string (`?topic=design-pattern/behavioral&language=go&level=intermediate`) ;
  l'URL est partageable et le bouton retour restaure l'état. Plusieurs valeurs d'une facette sont séparées par des
  virgules et se combinent en OU ; les facettes se combinent en ET. Un topic filtre sa branche de l'arbre. Le HTML
  prérendu n'a pas de filtre : la query string s'applique après l'hydratation.
- Livré au lot 3 du M3 : les facettes et l'état vide. La recherche, les compteurs et le tri arrivent au lot 4, la
  facette de santé au lot 6.
- Recherche plein texte combinée aux facettes ; compteurs par valeur de facette.
- Tri : pertinence (si recherche), ordre du catalogue (par défaut), récemment mis à jour.
- **État vide** : « Aucun template ne correspond », liste des filtres actifs avec retrait individuel, bouton
  Réinitialiser.

## 5. Page template — `/templates/<name>`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Templates / Design patterns / Comportement                             │
│ Strategy                                    ● healthy   official  MIT-0  │
│ Replace a growing switch with interchangeable behaviours.                │
│ Langage : [TypeScript ▾]   Niveau : intermédiaire                        │
│ [ ▶ Ouvrir dans la sandbox ]  [ Comparer ▾ ]  [ Exercices ▾ ]            │
├───────────────────────────────────────────┬──────────────────────────────┤
│ Ce que vous allez voir (tour)             │ Topics                       │
│  1. The growing switch                    │  design-pattern/behavioral/… │
│  2. Extracting the strategy               │  principle/open-closed       │
│  3. Adding a behaviour without editing    │ Variantes                    │
│ Avant / après                             │  Kotlin · Go                 │
│  base : strategy-base   [Voir le diff]    │ Liés                         │
│ Exercices                                 │  OCP · Hexagonal             │
│  ◇ add-shipping-rule (refactor)           │ Utiliser hors de Typika     │
│                                           │  npx typika create strat… ⧉ │
│                                           │ Embed                     ⧉  │
│                                           │ Mainteneurs · Licence · Ref  │
└───────────────────────────────────────────┴──────────────────────────────┘
```

- Le sélecteur de langage navigue vers la variante (`/templates/<name-variante>`).
- « Comparer » propose les variantes disponibles → `/compare/<name>?a=<lang>&b=<lang>`.
- « Voir le diff » ouvre la sandbox sur la vue diff depuis la base (§8).
- Copie de la commande CLI et du snippet d'embed en un clic, avec confirmation accessible.
- Si `parent` existe : lien vers le parent et « diff avec le parent ».
- Livré au lot 3 du M3 : le fil d'Ariane, le sélecteur de langage (liens, utilisables sans JavaScript), le tour, la
  base avec « Voir le diff », les exercices, les topics, les variantes, les mainteneurs, la licence et la ref. Restent
  à venir : la comparaison (M4), la commande CLI, l'embed, les templates liés, le badge de santé (lot 6) et le diff
  avec le parent.

## 6. Sandbox — `/play/<name>`, `/p/<projectId>`, `/s#…`, `/g/<gistId>`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ strategy-ts ▾  ● modifié     [▶ Run] [✓ Tests] [⟲ Reset] [Partager ▾] [⋯]│
├────────────┬──────────────────────────────────────┬──────────────────────┤
│ src/       │ src/pricing/strategy.ts          ✕   │ Tour  Preview  Diff  │
│  domain/   │  1 export interface PricingStrat…    │ Étape 2 / 5          │
│  pricing/  │  2   price(order: Order): Money      │ Extracting the       │
│  ●strat…   │  3 }                                 │ strategy             │
│ tests/     │ ▌4 export class FlatRate implem…     │ The switch in …      │
│ tour/      │ ▌5   …                               │                      │
│            │                                      │ [← Préc.] [Suiv. →]  │
├────────────┴──────────────────────────────────────┴──────────────────────┤
│ Console │ Tests (12 ✓ 1 ✕)                                               │
│ ✕ pricing › applies shipping rule   expected 12 to be 15  tests/pri…:22  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Layout

- Trois colonnes redimensionnables : arbre de fichiers, éditeur à onglets, panneau latéral (Tour, Preview, Diff,
  Exercice). Panneau bas : Console, Tests.
- Chaque panneau est repliable ; la disposition est mémorisée par appareil.
- Panneau latéral par défaut : Tour si le template en a un, sinon Preview si le runtime en expose une.

### 6.2 Fichiers et éditeur

- Créer, renommer, supprimer, déplacer des fichiers ; indicateur ● sur les fichiers modifiés.
- Les fichiers propres à Typika (`typika.toml`, `tour/`) sont visibles mais regroupés et en lecture seule par
  défaut.
- Autosauvegarde locale à chaque modification (débouncée), pas de bouton Enregistrer. Ouvrir `/play/<name>` crée un
  projet local au premier changement ; avant, rien n'est persisté. Revenir sur `/play/<name>` rouvre le projet le plus
  récent de ce template ; Reset le ramène aux fichiers d'origine.

### 6.3 Exécution et tests

- **Run** lance `commands.start` ; sortie dans Console. Un nouveau Run interrompt le précédent.
- **Tests** lance `commands.test` ; le panneau Tests affiche l'arbre suites / tests, durée, statut, message d'échec ;
  clic sur un test → ouvre le fichier à la ligne de l'assertion.
- Mode « relancer à la sauvegarde » activable pour les tests.
- Erreurs de compilation (TS, Go, Kotlin) : soulignées dans l'éditeur et listées dans Console.

### 6.4 Reset et diff de mes modifications

- **Reset** : restaure les fichiers depuis la ref épinglée d'origine, après confirmation listant les fichiers modifiés.
  Reset d'un seul fichier depuis son menu contextuel.
- **Diff → Mes modifications** : diff fichier par fichier entre la ref d'origine et l'état courant, côte à côte ou
  unifié.

## 7. Tour

- Liste des étapes dans le panneau Tour ; navigation Préc./Suiv. et accès direct par la liste.
- Ouvrir une étape ouvre le fichier ancré, fait défiler jusqu'à la plage et la surligne (bordure gauche + fond
  léger). Plusieurs ancres par étape : onglets ouverts dans l'ordre, la première active.
- Si l'utilisateur a modifié le fichier et que la plage ne correspond plus, l'étape l'indique (« le code a changé
  depuis ce tour ») et propose d'ouvrir la version d'origine en lecture seule.
- L'étape courante est dans l'URL (`#step=<id>`) : partageable, restaurée au rechargement.
- Les liens d'une étape vers un autre template ouvrent sa page dans un nouvel onglet.

## 8. Diff depuis la base

- Accessible depuis la page template et l'onglet Diff de la sandbox (« Depuis la base »).
- Liste des fichiers ajoutés / modifiés / supprimés entre `base` et le template, puis diff côte à côte.
- Annotations : si une étape de tour ancre une plage présente dans le diff, un marqueur renvoie vers l'étape.
- Lecture seule. Un bouton « Ouvrir la base » ouvre la base dans une sandbox séparée.
- Dans la sandbox, l'onglet Diff liste les fichiers ; chacun s'ouvre dans un onglet de l'éditeur, pour avoir la
  largeur d'une vue côte à côte ([0021](../decisions/0021-diff-engine.md)).

## 9. Comparaison — `/compare/<name>?a=<lang>&b=<lang>`

- Deux colonnes : chacune un éditeur en lecture seule avec son arbre réduit, et en tête le langage et le nom de la
  variante.
- Un seul panneau Tour commun. Les étapes sont synchronisées **par id d'étape** : passer à l'étape `extract-strategy`
  ouvre dans chaque colonne le fichier et la plage ancrés par l'étape de même id.
- Étape absente d'un côté : colonne grisée avec « Cette étape n'a pas d'équivalent en <langage> », et le texte
  spécifique de la variante s'il existe (cas où le pattern se dissout dans le langage).
- `a` et `b` absents : `a` = TS, `b` = première variante disponible. Langage inconnu : message et sélecteurs.
- « Ouvrir dans la sandbox » sur chaque colonne.

## 10. Exercices — `/play/<name>?exercise=<id>`

- Le projet démarre dans l'état initial de l'exercice ; le panneau latéral affiche l'onglet Exercice.
- Contenu : titre, type (`fix` / `refactor`), énoncé, tests cibles, progression (`3 / 5 tests cibles verts`).
- **fix** : objectif = les tests cibles passent sans casser les autres.
- **refactor** : objectif = les tests de la nouvelle exigence passent ; l'énoncé explique pourquoi c'est pénible dans
  l'état actuel. Validation uniquement par les tests ; la structure du code n'est pas notée.
- **Validation** : automatique à chaque run de tests ; quand tout est vert, message de réussite et lien vers
  l'exercice suivant ou le concept lié. État « réussi » mémorisé localement.
- **Indices** : révélés un par un, dans l'ordre défini par l'auteur.
- **Solution** : bouton disponible à tout moment, avec confirmation ; ouvre la solution en diff avec le code courant,
  sans l'écraser. Un bouton séparé l'applique.
- Recommencer l'exercice = reset vers l'état initial de l'exercice.

## 11. Mes projets — `/projects`

- Liste : nom, template d'origine, langage, date de modification, statut d'exercice éventuel.
- Actions : ouvrir, renommer, dupliquer, exporter (zip), partager, supprimer (confirmation).
- Indicateur d'espace utilisé et avertissement à l'approche du quota (voir [sharing-and-cli](sharing-and-cli.md)).
- **État vide** : explication que les projets restent dans ce navigateur, lien vers le hub.

## 12. Projets partagés — `/s#<payload>`, `/g/<gistId>`

- Ouverture en lecture-écriture dans une sandbox **éphémère** : rien n'est enregistré tant que l'utilisateur ne clique
  pas « Enregistrer dans mes projets » ou ne modifie pas un fichier (création automatique, signalée).
- Bandeau : « Projet partagé, basé sur <template> » avec lien vers le template d'origine s'il est connu.
- Payload invalide ou version inconnue, gist introuvable : écran d'erreur avec la cause et lien vers le hub.

## 13. Embed — `/embed/<name>`

UI réduite : éditeur + sortie (Console ou Tests), barre minimale avec Run, Tests et « Ouvrir dans Typika ».

| Paramètre | Valeurs | Défaut |
|---|---|---|
| `file` | chemin | `runtime.entry` |
| `lines` | `L10-L24` | — (surligne la plage) |
| `tour-step` | id d'étape | — (affiche l'étape au-dessus de l'éditeur) |
| `panel` | `console`, `tests`, `preview`, `none` | `console` |
| `readonly` | `true`, `false` | `false` |
| `run` | `auto`, `click` | `click` |
| `theme` | `light`, `dark`, `auto` | `auto` |
| `lang` | `en`, `fr` | langue du navigateur |
| `height` | — | non supporté : la hauteur est celle de l'iframe |

- Le runtime ne démarre qu'à la première interaction (ou `run=auto`), pour ne pas charger des Mo dans une page de
  blog à l'ouverture.
- L'éditeur s'ouvre sans language service TypeScript ; l'IntelliSense se charge à la demande
  ([0015](../decisions/0015-editor.md)).
- Un runtime qui exige l'isolation cross-origin (`SharedArrayBuffer`) ne démarre pas en embed : la barre propose
  « Ouvrir dans Typika » à la place de Run et Tests ([0016](../decisions/0016-isolation-and-embed.md)).
- Aucune persistance locale dans l'embed ; « Ouvrir dans Typika » transfère l'état courant via un partage URL.

### postMessage

Origine émettrice : celle de Typika. Le parent doit vérifier `event.origin`.

| Sens | Message | Usage |
|---|---|---|
| embed → parent | `{ type: 'typika:ready' }` | Embed prêt. |
| embed → parent | `{ type: 'typika:resize', height }` | Hauteur de contenu souhaitée, si le parent veut adapter l'iframe. |
| embed → parent | `{ type: 'typika:test-result', passed, failed }` | Fin d'un run de tests. |
| parent → embed | `{ type: 'typika:goto-step', id }` | Changer d'étape de tour. |
| parent → embed | `{ type: 'typika:set-theme', theme }` | Suivre le thème du site hôte. |

Aucun message ne permet au parent de lire ou d'écrire le code.

## 14. Raccourcis clavier

`Mod` = Cmd sur macOS, Ctrl ailleurs. Liste affichée par `?`.

| Raccourci | Action | Portée |
|---|---|---|
| `/` | Focus recherche | Hub |
| `Mod+K` | Palette : templates, fichiers du projet, commandes | Partout |
| `Mod+Enter` | Run | Sandbox |
| `Mod+Shift+Enter` | Lancer les tests | Sandbox |
| `Mod+P` | Ouvrir un fichier | Sandbox |
| `Mod+B` | Afficher / masquer l'arbre | Sandbox |
| `Mod+J` | Afficher / masquer le panneau bas | Sandbox |
| `Alt+→` / `Alt+←` | Étape de tour suivante / précédente | Sandbox, comparaison |
| `Mod+Shift+D` | Onglet Diff | Sandbox |
| `Esc` | Fermer palette / dialogue ; sortir de l'éditeur (voir §15) | Partout |

Les raccourcis ne doivent pas écraser ceux de l'éditeur ni du navigateur ; conflits à vérifier au moment de
l'implémentation. `Alt+→` / `Alt+←` ne changent pas d'étape quand le focus est dans l'éditeur ou un champ de
saisie (CodeMirror s'en sert pour avancer d'un mot sur macOS) ; ailleurs, ils remplacent « page précédente » du
navigateur sous Windows et Linux.

## 15. Accessibilité

Cible : WCAG 2.2 niveau AA.

- **Clavier** : tout est utilisable sans souris. L'éditeur capture Tab pour l'indentation ; `Esc` puis `Tab` en sort
  (comportement à documenter dans l'aide).
- **Ordre de focus** : arbre → éditeur → panneau latéral → panneau bas ; liens d'évitement en tête de page.
- **Lecteurs d'écran** : régions nommées (landmarks) ; résultats de tests et fin de Run annoncés via une région
  `aria-live` polie ; changement d'étape de tour annoncé avec son titre ; badges de santé avec texte, pas seulement
  une couleur.
- **Contraste** : AA en thèmes clair et sombre, y compris coloration syntaxique et surlignage du tour.
- **Mouvement** : défilement animé désactivé si `prefers-reduced-motion`.
- **Diff** : ajouts / suppressions distingués aussi par un signe (`+` / `-`), pas seulement par la couleur.
- Zoom navigateur jusqu'à 200 % sans perte de fonction.

## 16. Responsive et mobile

| Largeur | Comportement |
|---|---|
| ≥ 1024 px | Layout complet. |
| 640-1023 px | Arbre en tiroir ; panneau latéral en onglet à côté de l'éditeur. |
| < 640 px | Un panneau à la fois, navigation par onglets en bas : Code, Tour, Sortie. |

- **Mobile** : hub, page template, tour, comparaison (une colonne à la fois avec bascule) et diff sont pleinement
  utilisables.
- **Édition limitée** : édition possible mais non optimisée ; un message suggère un écran plus large pour les
  exercices. Runtimes lourds : avertissement de taille de téléchargement avant chargement sur réseau mobile si le
  navigateur expose l'information.

## 17. Internationalisation

- UI en anglais et français ; langue détectée depuis le navigateur, modifiable dans le menu, mémorisée localement.
- Le contenu des templates (titres, résumés, tours, énoncés) reste en anglais en V1 ; en UI française, un libellé
  discret l'indique sur la page template.
- Dates et nombres formatés selon la langue choisie.
- Aucune chaîne en dur dans les composants ; clés de traduction par module.
