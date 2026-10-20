# 0032 — CLI : archives GitHub et `validate --run` dans Node

**Statut** : Acceptée · 2026-10-20 · lot 5 du M5 · complète [sharing-and-cli §6-7](../specs/sharing-and-cli.md)

## Contexte

Le lot 5 construit `packages/cli`, le package `typika` : `typika create` et `typika validate`. La spec fixe le
téléchargement de « l'archive de la ref épinglée depuis GitHub », et un `validate --run` qui fait tourner les
templates « dans un navigateur headless ». Trois points restaient ouverts. D'abord, d'où viennent les archives quand
le registre est servi en local, puisque `typika/templates` n'existe pas encore (#92). Ensuite, ce que coûte le
navigateur de `--run`. Enfin, quel service de compilation Kotlin utiliser par défaut.

Vérifié le 2026-10-20 sur un dépôt public : `codeload.github.com/<owner>/<repo>/tar.gz/<ref>` accepte un SHA court de
12 caractères, comme nos refs, et `HEAD`. Il répond `404` sur une ref absente, et range tout sous un dossier racine
`<repo>-<ref>/`. Ce n'est pas l'API REST : la limite de 60 requêtes par heure ne s'applique pas.

## Décision

- **Une archive par template, au gabarit `{owner}`, `{repo}`, `{ref}`.** La valeur par défaut est codeload, et
  l'option `--archive-url` la remplace, pour une instance auto-hébergée ou pour les tests. Le CLI dézippe avec
  `node:zlib`, puis lit le tar avec un lecteur maison d'une soixantaine de lignes (ustar, `path` des en-têtes pax,
  noms longs GNU). Il retire le dossier racine, puis garde le sous-dossier `path` de la ref. Une ref non épinglée
  télécharge `HEAD`, avec un avertissement.
- **Les tests passent par un registre local** : `serveLocalRegistry` construit l'index avec `buildLocalIndex`, puis
  sert chaque archive avec `git archive <sha>:templates`. C'est le même contenu que l'archive de codeload, au dossier
  racine près.
- **`--keep-tour` garde tous les fichiers Typika**, `exercises/` compris, et ajoute `parent`, comme l'export zip
  « avec les fichiers Typika ». Sans `exercises/`, le `typika.toml` gardé déclarerait des exercices absents. Avec
  `--exercise`, `exercises/` part toujours, puisque la spec retire indices et solution.
- **`validate --run` utilise les runners de `template-check`, dans Node.** Il n'y a pas de navigateur à télécharger.
  Ce sont les runners qui jouent V9 dans le contrôle local et dans `registry-tools`. `--run` vérifie aussi que les
  tests du template passent, sous un nouveau code, `E_TESTS_FAIL`. Le boot de l'entrée, lui, reste au run de santé
  (V8).
- **Pas de service Kotlin par défaut.** Le relais de l'instance publique refuse toute requête dont l'`Origin` n'est
  pas l'app ([0029](0029-kotlin-relay-rate-limit.md)). Sans `--kotlin-compiler <url>`, qui désigne le service de
  compilation lui-même, `--run` dit qu'il n'a pas exécuté le template Kotlin.
- **`validate` ne contrôle pas les refs.** La symétrie des variantes et le rôle de la base dépendent du registre.
  L'ordre du tour est comparé à la variante TypeScript, si l'index et son archive sont joignables. Sinon, une note le
  signale.
- **Valeurs par défaut provisoires** : l'index par défaut est `https://typika.dev/registry/index.json`, et le README
  ajouté renvoie à `https://typika.dev/templates/<name>`. Le domaine n'est pas réservé (#92).

## Conséquences

- `typika create strategy-ts`, puis les variantes `go` et `kotlin`, ont été lancés contre le registre local le
  2026-10-20. Les trois projets passent leurs tests hors de Typika : `npm test` (11 tests), `go test ./...` et
  `gradle test`. Cette vérification native est faite à la main, comme au lot 3. L'E2E du package compare les fichiers
  créés à `git ls-tree` à la ref épinglée.
- Le package n'est pas publié. Son `bin` lance `src/cli.ts` grâce au type stripping de Node 24, et il dépend des
  packages du workspace. Le runner Go lit les assets de `@typika/runtime-go` sur le disque. Pour publier (#92), il
  faudra un bundle et un téléchargement des assets Go au premier `--run`. On pourra alors revenir à Node ≥ 22, comme
  le dit la spec.
- Un rapport de `validate` donne le fichier ou le champ, pas la ligne : les codes du manifeste n'en portent pas.

## Alternatives écartées

- **Le miroir au format jsDelivr ([0022](0022-template-files-source.md))** : il faut une requête de liste, puis une
  requête par fichier. L'archive tient en une seule requête, et la spec la prévoit.
- **L'API REST de GitHub (`/tarball`)** : elle est limitée à 60 requêtes par heure sans jeton.
- **Le package npm `tar`** : c'est une dépendance de plus, pour un format qu'une soixantaine de lignes suffisent à
  lire.
- **Playwright pour `--run`** : il télécharge environ 150 Mo de navigateur, pour exécuter les mêmes runners que ceux
  qui tournent déjà dans Node.
