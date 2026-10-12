# 0023 — Prérendu du hub depuis l'index du build

**Statut** : Acceptée · 2026-10-12 · lot 3 du M3

## Contexte

Les pages du hub (`/`, `/templates`, la page template) doivent être lisibles sans JavaScript et indexables
([ui §1](../specs/ui.md), [architecture §4](../specs/architecture.md)). Le reste de l'app est une SPA servie par un
shell statique (TanStack Start en mode SPA). L'index n'est plus embarqué dans le bundle client depuis le lot 2
([0022](0022-template-files-source.md)). Les specs donnaient deux routes pour la page template : `/templates/<name>`
dans `ui.md`, `/t/$templateId` dans `architecture.md`.

## Décision

- **Route** : `/templates/$name`, où `name` est le `name` du manifeste, comme pour `/play/$name`. L'URL suit le fil
  d'Ariane de la liste.
- **Prérendu TanStack Start** : le build rend `/` et `/templates`, puis suit leurs liens vers `/templates/<name>`. Un
  filtre écarte tout le reste (sandbox, URL avec query string). La page `/` existe désormais, et le crawler ignore un
  second chemin identique : le shell SPA est rendu sur `/play/_shell`, une route `ssr: false` qui répond 200. Il reste
  écrit dans `_shell.html`.
- **Données** : chaque route du hub a un loader qui lance un programme du module `hub` sur `RegistryIndexPort`, et le
  loader ne renvoie que le modèle de sa page. Côté serveur, l'adaptateur lit le module virtuel
  `virtual:typika/registry-index`. Le plugin Vite `registry-index` le produit avec `buildLocalIndex` de
  `registry-tools`, et refuse de le charger dans l'environnement client. Côté client, l'adaptateur lit
  `TYPIKA_REGISTRY_INDEX_URL`, ce qui ne sert qu'aux pages non prérendues. Le même plugin émet `registry/index.json`
  dans `dist/client` et le sert en développement.
- **Liens** : les liens du hub sont des `<a>` simples. Chaque page arrive avec son HTML prérendu et ses données, sans
  requête à l'index.
- **Serveur** : pour un chemin sans extension, le serveur sert `<chemin>/index.html` s'il existe, avec une CSP qui
  autorise les hashes de ses propres scripts inline. Sinon il sert le shell. Un fichier `.html` n'est jamais servi à
  son propre chemin.
- **Filtres** : la liste prérendue n'a pas de filtre. Le client applique ceux de la query string après l'hydratation
  (`useHydrated`), pour que le premier rendu corresponde au HTML.
- **Langue** : le HTML prérendu est en anglais. `AppProviders` passe ensuite à la langue du navigateur en fournissant
  une instance i18n clonée, portée par un état React. React hydrate d'abord, avec l'ancien contexte, les frontières
  Suspense encore en attente. Si l'on changeait la langue de l'instance partagée, elles s'hydrateraient dans la
  nouvelle langue, d'où l'erreur React #418 vue pendant le lot.

## Conséquences

- Les pages du hub reflètent l'index du build. Un nouveau template n'apparaît sur l'accueil et la liste qu'après un
  rebuild. D'ici là, sa page est servie par le shell et rendue côté client.
- L'index entre dans le bundle serveur (`dist/server`), qui ne sert qu'au prérendu. Le bundle client ne le contient
  pas, et un test E2E de production le vérifie.
- Le serveur de développement construit l'index au démarrage (environ 3 s, `git` requis), à partir des refs épinglées
  du registre local.
- Un visiteur francophone voit l'anglais le temps de l'hydratation. Le lot `i18n` du M3 décidera s'il faut des pages
  prérendues par langue.

## Alternatives écartées

- **SSR à l'exécution** : le serveur devrait rendre chaque page et charger l'index. Le prérendu garde un coût serveur
  nul et un hébergement statique possible.
- **Loader par server function** : les pages appelleraient le serveur à chaque navigation, et l'hébergement statique
  ne suffirait plus.
- **Index dans le bundle client** : c'est ce que le lot 2 a retiré.
- **`/t/$name`** : plus court, mais l'URL ne dit plus qu'il s'agit de la liste des templates.
