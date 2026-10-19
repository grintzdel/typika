# Persistance, partage, export et CLI

Statut : brouillon · 2026-10-08 · Voir aussi : [ui](ui.md), [registry](registry.md), [manifest](manifest.md),
[security](security.md)

Aucune donnée utilisateur n'est stockée par Typika. Les projets vivent dans le navigateur ; le partage passe par l'URL
ou par le compte GitHub de l'utilisateur.

## 1. Persistance locale

### 1.1 Schéma IndexedDB

Base `typika`, versionnée.

| Store | Clé | Contenu |
|---|---|---|
| `projects` | `id` (UUID) | `{ id, name, origin, createdAt, updatedAt, exercise?, ui }` |
| `files` | `[projectId, path]` | `{ projectId, path, content, updatedAt }` ; index sur `projectId` |
| `templateCache` | `ref` épinglée | Fichiers d'origine d'un template : sert au reset, au diff et au mode hors ligne |
| `exerciseProgress` | `[templateName, exerciseName]` | `{ status: 'started' \| 'passed', hintsRevealed, passedAt? }` |
| `meta` | clé | Version du schéma applicatif, préférences (langue, thème, layout) |

Au M1, seuls `projects` et `files` existent (version 1 de la base) ; les autres stores arriveront avec leur jalon, par
migration. Les templates sont alors intégrés à l'app et n'ont pas de ref : `origin` vaut `{ kind: 'template', name }`, et
le reset relit le template intégré. La ref épinglée et `templateCache` arrivent avec le registre (M3).

`origin` d'un projet :

```ts
type ProjectOrigin =
  | { kind: 'template'; name: string }
  | { kind: 'exercise'; name: string; exercise: string }
  | { kind: 'share-url'; name: string; exercise?: string }
  | { kind: 'gist'; gistId: string; parent?: string }
  | { kind: 'blank'; runtime: 'browser-js' | 'node' | 'go' | 'kotlin' }
```

La ref épinglée du template est à côté de l'origine, dans `projects.ref`. C'est le `parent` d'un remix, conservé à
l'export (§4, §5). `gist` et `blank` ne sont pas encore implémentés.

Un template peut avoir plusieurs projets : `/p/<projectId>` ouvre l'un d'eux, et `/play/<name>` rouvre le plus récent
de son origine.

Fichiers stockés en texte UTF-8. Les binaires sont refusés à l'import (limites dans [security](security.md)).

Les runtimes lourds (WASM, toolchains) ne sont pas dans IndexedDB : ils sont mis en Cache Storage par leur runtime ([0027](../decisions/0027-go-assets-delivery.md)).

### 1.2 Quotas

- Au démarrage, `navigator.storage.persist()` est demandé lors de la création du premier projet, pour réduire le
  risque d'éviction par le navigateur. Le résultat dépend du navigateur et n'est pas garanti.
- `navigator.storage.estimate()` alimente l'indicateur d'espace de `/projects`.
- Au-delà de 80 % du quota estimé : avertissement, suggestion d'exporter ou de supprimer des projets.
- Écriture refusée (quota dépassé) : l'édition continue en mémoire, bandeau persistant « non enregistré », actions
  proposées : exporter, libérer de l'espace.
- `templateCache` est purgé en premier (LRU) : il se reconstruit depuis le réseau.
- L'UI rappelle que les données locales disparaissent si l'utilisateur efface les données du site.

### 1.3 Migration

- Chaque changement de schéma incrémente la version IndexedDB ; la migration s'exécute dans l'événement
  `upgradeneeded`, étape par étape (v1→v2→v3), jamais de saut.
- Une migration est testée avec un jeu de données de la version précédente.
- Migration en échec : la base est laissée intacte, l'app propose d'exporter tous les projets en zip avant toute autre
  action.
- Plusieurs onglets ouverts : un onglet sur une version ancienne reçoit `versionchange`, ferme sa connexion et demande
  un rechargement.

## 2. Partage par URL — `/s#<payload>`

Pour les petits projets, sans serveur ni compte. Le payload est dans le **fragment** : il n'est pas envoyé au serveur
par le navigateur.

### 2.1 Format

```
<version>.<données>
```

- `version` : entier, actuellement `1`.
- `données` : base64url de la compression du JSON suivant. Algorithme : `deflate-raw` via `CompressionStream` si
  disponible ; choix définitif et repli à confirmer en implémentation.

```jsonc
{
  "n": "strategy-ts (remix)",            // nom
  "o": "github:typika/templates/strategy/ts@3f2c9a1e7b4d", // origine, optionnelle
  "r": "browser-js",                     // runtime
  "x": "implement-express",              // exercice, optionnel : le delta part de son état de départ
  "f": { "src/main.ts": "…" },           // fichiers complets si pas d'origine
  "d": { "src/pricing/strategy.ts": "…", "src/old.ts": null } // ou delta vs origine : contenu complet ou null = supprimé
}
```

- Si `o` est présent et résoluble, seuls les fichiers modifiés sont encodés (`d`) ; c'est le cas courant et cela
  réduit fortement la taille.
- Si `o` est absent ou introuvable à l'ouverture, `f` est requis ; sinon erreur explicite.
- V1 : Typika émet toujours `o` et `d`, et n'ouvre un lien que si `o` désigne un template de l'index. `f` est lu à la
  place de `d` quand il est présent. Un lien sans origine attend les projets `blank`.
- `deflate-raw` via `CompressionStream` est retenu, sans repli : les navigateurs visés l'ont tous.

### 2.4 Ouverture

- Le lien s'ouvre dans une sandbox éphémère. Le projet local est créé à la première modification, ou sur « Enregistrer
  dans mes projets », avec l'origine `share-url` et la ref de `o`.
- Son id est dérivé du payload (SHA-256, au format UUID) : rouvrir le même lien dans le même navigateur rouvre la copie
  enregistrée, au lieu d'en créer une autre.
- Reset ramène aux fichiers du template d'origine (ou de l'état de départ de l'exercice), comme pour un projet de
  template.

### 2.2 Seuil

- Limite : URL complète ≤ 8 000 caractères (marge sous les limites courantes des navigateurs, messageries et
  raccourcisseurs ; à ajuster selon les tests).
- Au-dessus : l'option URL est désactivée avec la raison, et le partage par gist est proposé.

### 2.3 Versionnement

- Toute évolution incompatible du JSON incrémente `version`.
- L'app décode toutes les versions qu'elle a connues ; une version inconnue (payload plus récent que l'app) affiche
  « ce lien a été créé avec une version plus récente de Typika ».

## 3. Partage par gist — `/g/<gistId>`

- Nécessite une connexion GitHub OAuth (scope `gist` uniquement). Le jeton est obtenu via l'endpoint d'échange de
  l'instance, conservé en mémoire de session (`sessionStorage`), jamais côté serveur.
- Création : un gist **secret** par défaut (option public), un fichier par fichier du projet. Les chemins avec `/` sont
  encodés car un gist est plat : séparateur `__` ou équivalent, et un fichier `typika.share.json` qui porte la table
  des chemins, l'origine et le runtime.
- Re-partager un projet déjà partagé met à jour le même gist (l'id est gardé dans `projects.origin` ou `ui`).
- Ouverture de `/g/<gistId>` : lecture via l'API publique GitHub, sans connexion. Les limites de débit de l'API pour
  les requêtes anonymes s'appliquent ; en cas de dépassement, message et proposition de se connecter.
- Un gist secret reste accessible à quiconque a le lien : l'UI le dit au moment du partage.

## 4. Export zip

- Depuis la sandbox et `/projects`, sans connexion.
- Contenu : les fichiers du projet, dont `typika.toml` (avec `parent` si remix) et `tour/`.
- Option « sans les fichiers Typika » : même règle que `typika create` sans `--keep-tour` (§6.4).
- Nom : `<nom-du-projet>.zip`.

## 5. Push vers GitHub

- Connexion OAuth avec le scope nécessaire à la création de dépôt (`public_repo`, ou `repo` si l'utilisateur choisit
  privé) ; le scope n'est demandé qu'au moment du push.
- Formulaire : nom du dépôt, visibilité, description, inclure les fichiers Typika (oui par défaut).
- Crée le dépôt, puis un commit initial unique sur la branche par défaut. Pas de push vers un dépôt existant en V1.
- Le `typika.toml` poussé conserve `parent` ; un README minimal est ajouté s'il n'existe pas, avec un lien vers le
  template d'origine.
- Résultat : lien vers le dépôt et suggestion « proposer au registre » ([registry](registry.md#2-processus-de-contribution)).
- Erreurs (nom déjà pris, scope refusé, limite d'API) : message avec la cause, formulaire conservé.

## 6. CLI `typika create`

Package npm `typika`, utilisable via `npx typika`. Node ≥ 22.

### 6.1 Commandes

```
typika create <template> [dir] [options]
typika validate [dir] [options]
typika --version | --help
```

### 6.2 Arguments et options de `create`

| Élément | Description |
|---|---|
| `<template>` | Nom du registre (`strategy-ts`) ou ref (`github:owner/repo/path@ref`). |
| `[dir]` | Dossier cible. Défaut : nom du template. Doit être absent ou vide. |
| `--variant <lang>` | Prendre la variante dans ce langage (`go`, `kotlin`…). Erreur si elle n'existe pas. |
| `--exercise <name>` | Créer le projet dans l'état initial de cet exercice, énoncé inclus. |
| `--keep-tour` | Garder `typika.toml` et `tour/`. |
| `--no-install` | Ne pas installer les dépendances. Par défaut, l'installation n'est pas lancée non plus en V1 ; la commande est affichée. |
| `--registry <url>` | URL d'un `index.json` alternatif (instance auto-hébergée). |
| `--force` | Autoriser un dossier non vide. |
| `--json` | Sortie machine (une ligne JSON finale). |

### 6.3 Résolution

1. `<template>` contient `github:` → ref directe, sans passer par le registre ; avertissement si la ref n'est pas
   épinglée sur un SHA.
2. Sinon → recherche par nom dans l'index (défaut : index de l'instance publique). Template `deprecated` : avertissement,
   création quand même ; `broken` : avertissement.
3. `--variant` → résolution via `variants` de l'entrée trouvée.
4. Téléchargement de l'archive de la ref épinglée depuis GitHub ; extraction du sous-dossier `path` si présent.
5. Validation du manifeste ; version de `schema` inconnue → erreur.

### 6.4 Sortie

- Par défaut, retire : `typika.toml`, `tour/`, la définition des exercices et leurs solutions.
- Avec `--keep-tour` : garde `typika.toml` et `tour/`.
- Avec `--exercise` : garde l'énoncé de l'exercice dans `EXERCISE.md`, retire indices et solution.
- Ajoute un `README.md` s'il n'existe pas, avec titre, résumé, lien vers la page du template.
- Affiche les prochaines étapes : `cd <dir>`, commande d'installation et de test selon le langage.

### 6.5 Codes de sortie

| Code | Cas |
|---|---|
| `0` | Succès |
| `1` | Erreur inattendue |
| `2` | Arguments invalides |
| `3` | Template introuvable (nom ou ref) |
| `4` | Variante ou exercice introuvable |
| `5` | Manifeste invalide ou version de schéma non supportée |
| `6` | Dossier cible non vide (sans `--force`) |
| `7` | Erreur réseau ou limite d'API GitHub |

## 7. `typika validate`

Pour les auteurs de templates, avant une PR au registre. Exécute en local les validations automatiques du registre qui
ne dépendent pas du registre lui-même ([registry §2.2](registry.md#22-validations-automatiques-bloquantes)).

```
typika validate [dir] [--run] [--json]
```

| Vérification | Sans `--run` | Avec `--run` |
|---|---|---|
| Manifeste valide (schéma, facettes, topics connus) | ✓ | ✓ |
| Licence présente | ✓ | ✓ |
| Fichiers référencés présents, ancres de tour dans les bornes | ✓ | ✓ |
| Ids d'étapes uniques ; alignement avec la variante TS de référence si elle est accessible | ✓ | ✓ |
| Taille et types de fichiers dans les limites | ✓ | ✓ |
| Boot, tests, exercices (V8, V9) dans un navigateur headless | — | ✓ |

- `--run` télécharge un navigateur headless au premier usage ; Kotlin nécessite l'URL d'un service de compilation
  (`--kotlin-compiler <url>`, défaut : celui de l'instance publique).
- Sortie : liste des erreurs et avertissements avec fichier et ligne ; code `0` si aucune erreur, `5` sinon.
- Les topics connus sont lus depuis l'index du registre (même option `--registry`).
