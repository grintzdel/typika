# Guide — Écrire un template

Pour qui : toute personne qui écrit un template officiel (`typika/*`) ou tiers.
Références : format normatif dans [manifest.md](../specs/manifest.md), contenu attendu du catalogue dans
[catalogue.md](../specs/catalogue.md), entrée au registre dans [registry.md](../specs/registry.md).

Un bon template enseigne **une** idée. Le code la montre, la base fait ressentir le problème, le tour l'explique, les
exercices la font pratiquer. Si tu ne peux pas résumer l'idée en une phrase pour `summary`, le template est trop large.

## 1. Arborescence

```
strategy-ts/
├── typika.toml
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── shop/
│   │   ├── money.ts
│   │   └── order.ts
│   └── checkout/
│       ├── checkout.ts
│       ├── shipping-cost.ts
│       ├── shipping-quote.ts
│       └── options/
│           ├── standard.ts
│           └── express.ts
├── tests/
│   ├── standard-shipping.test.ts
│   ├── express-shipping.test.ts
│   └── shipping-quote.test.ts
├── tour/
│   ├── 01-overview.md
│   ├── 02-the-problem.md
│   ├── …
│   └── 06-trade-offs.md
└── exercises/
    ├── add-pickup-point-option/          # from = "base", solutionFrom = "self"
    │   ├── README.md
    │   ├── start/tests/pickup-point.test.ts
    │   └── solution/src/checkout/
    │       ├── checkout.ts
    │       ├── shipping-option.ts
    │       └── options/pickup-point.ts
    └── implement-express/
        ├── README.md
        ├── hint-1.md
        ├── start/src/checkout/options/express.ts
        └── solution/src/checkout/options/express.ts
```

Règles :

- Préfixe numérique sur les fichiers de tour (`01-`, `02-`) pour qu'ils se lisent dans l'ordre sur GitHub. L'ordre qui
  fait foi reste `tour.steps`.
- `README.md` : ce que le template enseigne, comment le lancer hors de Typika, liens vers les variantes. En anglais.
- `src/main.ts` (ou équivalent) DOIT produire une sortie console lisible : c'est ce que voit l'apprenant en cliquant sur
  « Run » avant même d'ouvrir le tour.

## 2. Écrire la base

La base est le code **avant** le concept. La vue « diff depuis la base » est la leçon : la base compte autant que le
template.

- **Réaliste, pas caricatural.** La base est le code qu'un développeur compétent écrit sous pression, pas un homme de
  paille. Si l'apprenant pense « personne n'écrit ça », la leçon est perdue.
- **Même comportement.** La base et le template passent la même suite de tests. Le template est un refactoring, pas une
  nouvelle fonctionnalité. Exception : les tests qui ciblent la nouvelle structure (ex. test de contrat du LSP).
- **Même noms, même disposition** partout où c'est possible. Chaque différence non liée au concept pollue le diff.
  Renseigne `base.focus` pour cacher les fichiers non concernés.
- **Le problème doit se sentir dans un exercice.** La base est le point de départ des exercices `refactor` : l'exigence
  doit y être pénible (duplication, `switch` de plus, test impossible).
- `role = "base"`, pas de tour, pas de variantes, pas d'exercices.

## 3. Écrire le code du template

- **Le domaine du fil rouge** (boutique : commandes, prix, paiement, livraison, notifications) et son vocabulaire
  commun ([catalogue.md §1](../specs/catalogue.md#1-fil-rouge--une-petite-boutique-en-ligne)). Ne pas inventer
  `Purchase` quand le catalogue dit `Order`.
- **Petit.** Visé : 5 à 15 fichiers de source, moins de 400 lignes hors tests. Au-delà, le concept se noie.
- **Aucune dépendance** hors bibliothèque standard et outil de test. Une dépendance est une chose de plus à expliquer,
  à mettre à jour et à charger dans le navigateur.
- **Déterministe.** Pas d'horloge, de hasard ou de réseau implicites : injecter une `Clock`, un générateur d'id. Les
  pannes (broker indisponible, refus de paiement) sont simulées par des faux contrôlables depuis les tests.
- **Peu de commentaires.** L'explication vit dans le tour, pas dans le code : l'apprenant qui exporte le template doit
  récupérer un code propre. Un commentaire n'est justifié que si le code seul induit en erreur.
- **Montants en entiers** (centimes) via `Money`. Jamais de flottant pour de l'argent, même dans un exemple.

## 4. Écrire le tour

### 4.1 Structure

- 4 à 6 étapes ([catalogue.md](../specs/catalogue.md) donne les `id` canoniques de chaque concept).
- Première étape `overview` : le problème en deux phrases, ce que l'apprenant va voir, sans ancre de code ou ancrée sur
  `main`.
- Dernière étape `trade-offs` : quand **ne pas** utiliser le concept, ce qu'il coûte, les concepts voisins (liens
  `typika:<name>`). Obligatoire : un pattern présenté sans ses coûts est de la publicité.
- Entre les deux : une étape = une idée = une ancre.

### 4.2 Style

| Règle | Pourquoi |
|---|---|
| Anglais simple, phrases courtes, deuxième personne (« you »). | Public international, lu à côté du code. |
| 60 à 180 mots par étape. | Au-delà, l'apprenant lit au lieu de regarder le code. |
| Commencer par **pourquoi**, puis **quoi**. Jamais une paraphrase du code surligné. | Le code est déjà à l'écran. |
| Nommer les symboles en `code` exactement comme dans le fichier. | L'apprenant les cherche des yeux. |
| Pas de « simply », « just », « obviously ». | Ce qui est évident pour l'auteur ne l'est pas pour l'apprenant. |
| Une image seulement si elle montre une structure que le code ne montre pas (flux, séquence). | Poids et maintenance. |

### 4.3 Ancrage

- Préférer `region` à `lines` : les marqueurs `// #region tour:<name>` / `// #endregion` survivent aux modifications.
  Ils sont retirés à l'export.
- Plage surlignée ≤ 40 lignes ; viser 5 à 20. Si l'idée demande plus, elle demande deux étapes.
- `also` pour ouvrir un fichier de contexte sans le surligner (l'interface implémentée, par exemple).

Exemple :

```markdown
+++
id = "strategy-interface"
title = "One interface, many prices"
file = "src/checkout/shipping-cost.ts"
region = "contract"
also = ["src/checkout/options/standard.ts"]
+++

Every shipping option answers the same question: *how much does this order cost to ship?*
`ShippingCost` is that question, and nothing else. …
```

## 5. Écrire les exercices

Chaque template a **au moins un exercice `refactor`** ; un `fix` est recommandé.

### 5.1 `refactor`

- Part de la base (`from = "base"`).
- L'exigence DOIT être **pénible sans le concept et simple avec** : c'est ce contraste que l'apprenant doit ressentir.
  Test de conception : écris la solution dans la base sans restructurer. Si c'est rapide et propre, l'exigence ne
  démontre rien ; choisis-en une autre.
- Les tests `failing` décrivent l'exigence par le comportement public, jamais par la structure : aucune vérification ne
  porte sur la forme du code ([manifest.md §6.3](../specs/manifest.md)). Un apprenant qui réussit sans appliquer le
  pattern a réussi l'exercice ; la solution de référence et le tour montrent l'autre chemin.
- `solution/` contient la version restructurée + l'exigence, cohérente avec le template. Déclarer
  `solutionFrom = "self"` : `solution/` ne contient alors que l'écart entre le template et la solution, au lieu de
  recopier le template.

### 5.2 `fix`

- Part du template (`from = "self"`) dont une pièce est retirée ou faussée via `start/`.
- Cible la **mécanique** du concept (l'ordre d'empilement des décorateurs, l'idempotence du consommateur), pas une
  faute de frappe.
- Un seul point à corriger par exercice.

### 5.3 Énoncé et indices

- `README.md` de l'exercice : contexte métier (2-3 phrases), exigence, critère « done » (« all tests pass »), fichiers
  par où commencer. Pas de solution.
- `hints` : du plus vague au plus précis. Le dernier indice peut nommer le concept, jamais donner le code.

## 6. Variantes et alignement

- **TypeScript est la référence.** Écrire la variante TS d'abord ; ses `id` d'étapes sont canoniques.
- **Idiome avant traduction.** Une variante Go qui reproduit une hiérarchie de classes TS est fausse même si ses tests
  passent. Écrire ce qu'un développeur expérimenté de ce langage écrirait.
- **Garder les `id`** dans le même ordre. Une étape sans équivalent peut être omise ; une étape propre au langage peut
  être ajoutée ([manifest.md §5.3](../specs/manifest.md)).
- **Quand le pattern se dissout dans le langage, garder l'étape et le dire** (« In Go, a strategy is just a function:
  there is no interface to declare »). C'est la leçon la plus précieuse du mode comparaison.
- **Mêmes tests métier** dans chaque variante (mêmes scénarios, mêmes noms traduits), pour que l'apprenant compare des
  comportements identiques.
- Déclarer les variantes des deux côtés (`[variants]` symétriques).

## 7. Tests

- Noms de tests = phrases de comportement métier (`charges express shipping at 12.90 for orders under 2 kg`).
- Rapides : viser moins de 2 s pour toute la suite dans le navigateur, runtime chargé.
- Indépendants de l'ordre d'exécution, sans état partagé entre tests.
- Pas de snapshots : un snapshot ne dit pas ce qui est attendu.
- Les tests sont lus par l'apprenant : ils documentent le comportement autant qu'ils le vérifient.

## 8. Conventions par langage

| | TypeScript / JavaScript | Go | Kotlin |
|---|---|---|---|
| Runtime | `browser-js` | `go` | `kotlin` (`target = "js"` par défaut) |
| Disposition | `src/`, `tests/` | `go.mod` (`module example.com/shop`), `cmd/shop/main.go`, `internal/<package>/` | `src/main/kotlin/`, `src/test/kotlin/` |
| Tests | API compatible Vitest : `describe`, `it` / `test`, `expect`, `beforeEach` — sous-ensemble exact dans [runtimes.md](../specs/runtimes.md) | Package `testing`, fichiers `*_test.go` | `kotlin.test` (`@Test`, `assertEquals`…) |
| `commands.test` | `"vitest"` | `"go test"` | `"kotlin.test"` |
| Dépendances | Aucune | Bibliothèque standard uniquement | Bibliothèque standard Kotlin + `kotlin.test` |
| Formatage | oxfmt (config du repo) | `gofmt` | Style officiel Kotlin |
| Fichiers | kebab-case (`shipping-quote.ts`) | snake_case (`shipping_quote.go`) | PascalCase (`ShippingQuote.kt`) |
| Hors Typika | `package.json` (`vitest`, `typescript` en devDependencies), `tsconfig.json`, Node ≥ 23.6 | `go.mod` | Gradle (à définir après R8) |

### 8.1 TypeScript sans outil de build

Un template TS s'exécute hors de Typika avec `node src/main.ts`, sans `tsx` ni compilation : Node retire les types à
la volée. Cela impose :

- des imports relatifs avec l'extension `.ts` (`import { money } from './money.ts'`) ;
- uniquement de la syntaxe effaçable : pas d'`enum`, de `namespace` ni de propriétés déclarées dans les paramètres du
  constructeur ;
- `import type` pour les imports de types seuls ;
- aucune API du DOM hors preview : le runtime `browser-js` s'exécute dans un worker, et l'éditeur ne charge que
  `lib.es2022` ([0015](../decisions/0015-editor.md)).

Le `tsconfig.json` le vérifie :

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

Scripts attendus dans `package.json` : `start` (`node src/main.ts`), `test` (`vitest run --dir tests`, pour ignorer les tests de `exercises/`), `typecheck` (`tsc`).

### 8.2 Go

Un template Go s'exécute hors de Typika avec `go run ./cmd/shop` et `go test ./...`. Go compile et lance les tests par
package, ce qui impose :

- **Un `exercises/go.mod`** (`module example.com/shop/exercises`). Les surcouches `start/` et `solution/` ne compilent
  pas seules ; un module imbriqué les sort des motifs `./...` du template.
- **Des tests `failing` qui compilent contre l'état de départ.** Un fichier de test qui ne compile pas casse tout son
  package, donc tous ses tests. Pour une valeur que la base ne connaît pas encore, écrire la conversion
  (`checkout.ShippingOption("pickup-point")`) plutôt que la constante de la solution.
- **Un `start/` de `fix` qui ne panique pas.** Un `panic` dans un test arrête le binaire de test : les tests suivants
  ne tournent pas. Renvoyer une valeur fausse (`shop.Zero`), pas `panic("not implemented")`.
- Tests boîte noire dans le package `<pkg>_test`, avec des sous-tests `t.Run("<phrase de comportement>", …)` : les
  noms restent ceux de la variante TS.

Contraintes en attente de spike :

- **Go (R7)** : le runtime navigateur (interpréteur Yaegi ou toolchain WASM) n'est pas choisi. En attendant, éviter
  `cgo`, `unsafe`, la réflexion avancée et `go:embed` ; génériques, goroutines et `context` à confirmer.
- **Kotlin (R8)** : compilation vers JS ou Wasm, donc **aucune API `java.*`** ni bibliothèque JVM. Coroutines à
  confirmer en cible JS / Wasm ; ne pas en dépendre tant que R8 n'est pas conclu.

## 9. Licence

- Templates officiels `typika/*` : `license = "MIT-0"` et le texte MIT-0 dans `LICENSE`. Pas d'en-tête de licence
  dans les fichiers source : le code est fait pour être copié.
- Templates tiers : toute licence approuvée OSI, identifiant SPDX dans le manifeste, texte dans `LICENSE`.
- Pas de code copié d'une source dont la licence est incompatible ou inconnue (exemples de livres, articles).

## 10. Checklist avant la PR au registre

Manifeste et structure :

- [ ] Le validateur ne remonte aucune erreur ; chaque avertissement restant est justifié dans la PR.
- [ ] `name` respecte la convention du catalogue (`<concept>-<lang>`, `<concept>-base-<lang>`).
- [ ] Topic principal en premier dans `facets.topic` ; `level` cohérent avec le catalogue.
- [ ] `LICENSE` présent et conforme à `license`.

Code :

- [ ] Vocabulaire du fil rouge respecté ; aucune dépendance hors standard et outil de test.
- [ ] « Run » produit une sortie lisible ; tous les tests passent dans la sandbox.
- [ ] Base et template passent la même suite de tests métier ; `base.focus` limite le diff aux fichiers utiles.
- [ ] Aucun commentaire qui répète le tour.

Tour :

- [ ] 4 à 6 étapes, `overview` en premier, `trade-offs` en dernier.
- [ ] `id` alignés sur la variante TS ; ordre relatif respecté.
- [ ] Ancres en `region` ; chaque plage surligne le code dont parle l'étape.
- [ ] Liens `typika:<name>` vers les concepts voisins listés dans le catalogue.

Exercices :

- [ ] Au moins un `refactor` qui part de la base ; l'exigence est pénible dans la base (vérifié en l'y écrivant).
- [ ] État de départ : seuls les tests `failing` sont rouges. Avec `solution/` : tout est vert.
- [ ] Énoncés sans solution ; indices progressifs.

Variantes :

- [ ] Code idiomatique du langage, pas une traduction.
- [ ] Étapes « dissoutes » conservées et expliquées.
- [ ] `[variants]` déclarées des deux côtés.

Relecture :

- [ ] Relu par quelqu'un qui ne connaît pas le concept : a-t-il compris l'idée en une session ?
