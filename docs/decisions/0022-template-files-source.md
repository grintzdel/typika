# 0022 — Fichiers des templates : jsDelivr à la ref épinglée

**Statut** : Acceptée · 2026-10-12 · lot 2 du M3

## Contexte

Au M3, l'app ne doit plus embarquer les templates ([registry §3](../specs/registry.md)). Elle lit l'index, puis charge
les fichiers d'un template depuis la ref épinglée de son entrée, dans le navigateur, sous COEP `require-corp`. Il faut
une source qui liste les fichiers d'un dossier à un commit et qui serve chaque fichier avec CORS ou
`Cross-Origin-Resource-Policy: cross-origin`.

## Décision

**jsDelivr** (`cdn.jsdelivr.net/gh/…` pour les fichiers, `data.jsdelivr.com/v1/packages/gh/…?structure=flat` pour la
liste) :

- Les fichiers sont servis à un SHA de commit, court de 12 caractères comme nos refs, avec
  `Access-Control-Allow-Origin: *` et `Cross-Origin-Resource-Policy: cross-origin`, sans quota (vérifié le 2026-10-12).
- Le contenu à un SHA ne change pas : le cache du CDN et celui du navigateur sont sûrs.
- L'app ne connaît que deux gabarits d'URL, `TYPIKA_TEMPLATE_FILE_URL_TEMPLATE` et
  `TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE` (`{owner}`, `{repo}`, `{ref}`, `{path}`), sur le modèle de
  `TYPIKA_PACKAGE_URL_TEMPLATE`. Une instance auto-hébergée sert un miroir au même format.
- `registry-tools mirror <index.json> --out <dossier>` écrit ce miroir : les fichiers de chaque entrée à sa ref, et la
  liste de chaque dépôt à chaque commit, au format de jsDelivr.

Jusqu'au lot 7 du M3, `typika/templates` n'existe pas : le build de l'app écrit l'index et le miroir dans
`dist/client/registry/`, et les valeurs par défaut pointent dessus. Au lot 7, elles passent à jsDelivr et au registre
officiel.

## Conséquences

- Le build lit l'historique Git du monorepo pour le miroir : `.git` entre dans le contexte Docker, et l'étage `build`
  installe `git`. L'image finale n'en contient rien.
- Ouvrir un template coûte une requête de liste et une requête par fichier, en parallèle. La liste couvre tout le dépôt
  au commit ; l'app ne garde que le dossier du template.
- En développement et dans les tests unitaires, l'adaptateur `bundled` lit `templates/` directement. Il est importé
  dynamiquement sous `import.meta.env.DEV`, donc absent du bundle de production.

## Alternatives écartées

- **API GitHub** (`contents`, `git/trees`) : 60 requêtes par heure et par IP sans authentification, déjà épuisées
  depuis un poste de développement pendant le lot.
- **`raw.githubusercontent.com`** : pas de liste de fichiers, et pas de `Cross-Origin-Resource-Policy`, donc refusé
  sous COEP `require-corp` sans CORS.
- **Archive du template dans l'index** : l'index doit rester sous 500 Ko compressé et ne contenir que les métadonnées
  du hub.
