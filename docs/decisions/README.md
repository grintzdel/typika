# Décisions (ADR)

Une décision structurante = un fichier `NNNN-slug.md` : contexte, décision, conséquences, alternatives écartées.
Une décision n'est jamais réécrite : on en crée une nouvelle qui la remplace, et on passe l'ancienne en
« Remplacée par NNNN ».

Statuts : `Proposée` (en attente d'un spike), `Acceptée`, `Remplacée par NNNN`.

| # | Décision | Statut |
|---|---|---|
| [0001](0001-browser-first.md) | Exécution dans le navigateur | Acceptée |
| [0002](0002-kotlin-compilation-service.md) | Kotlin via un service de compilation | Remplacée par 0019 |
| [0003](0003-static-templates.md) | Templates statiques en V1 | Acceptée |
| [0004](0004-git-registry-static-index.md) | Registre Git et index statique | Acceptée |
| [0005](0005-client-side-search.md) | Recherche et filtres côté client | Acceptée |
| [0006](0006-effect-atom-instead-of-redux.md) | Effect Atom plutôt que Redux | Acceptée |
| [0007](0007-no-business-backend.md) | Pas de backend métier | Acceptée |
| [0008](0008-codemirror-6.md) | CodeMirror 6 comme éditeur | Remplacée par 0015 |
| [0009](0009-typescript-reference-language.md) | TypeScript langue de référence, couverture sélective | Acceptée |
| [0010](0010-english-template-content.md) | Contenu des templates en anglais, interface bilingue | Acceptée |
| [0011](0011-licenses.md) | Licences | Acceptée |
| [0012](0012-language-scope.md) | Langages : TS, JS, Go, Kotlin | Acceptée |
| [0013](0013-dedicated-runtime-origin.md) | Origine dédiée à l'exécution | Acceptée |
| [0014](0014-name-typika.md) | Nom : Typika | Acceptée — recherche de marques au M0 |
| [0015](0015-editor.md) | Éditeur : CodeMirror 6 et adaptateur TypeScript maison | Acceptée |
| [0016](0016-isolation-and-embed.md) | Isolation cross-origin et embed | Acceptée — Firefox et Safari réel à vérifier |
| [0017](0017-node-runtime.md) | Pas de runtime `node` en V1 | Acceptée |
| [0018](0018-go-runtime.md) | Runtime Go : la toolchain Go compilée en WASM | Acceptée — Firefox à vérifier |
| [0019](0019-kotlin-runtime.md) | Runtime Kotlin : un service de compilation maison, cible JS | Acceptée — Firefox à vérifier |
| [0020](0020-tour-markdown.md) | Rendu Markdown du tour : react-markdown | Acceptée |
| [0021](0021-diff-engine.md) | Moteur de diff : @codemirror/merge | Acceptée |
| [0022](0022-template-files-source.md) | Fichiers des templates : jsDelivr à la ref épinglée | Acceptée |
| [0023](0023-hub-prerendering.md) | Prérendu du hub depuis l'index du build | Acceptée |
| [0024](0024-manifest-keywords.md) | Mots-clés de recherche dans le manifeste, sans changer de schéma | Acceptée |
| [0025](0025-health-run.md) | Le run de santé pilote l'app | Acceptée |
| [0027](0027-go-assets-delivery.md) | Assets Go : servis par l'image, gardés en Cache Storage | Acceptée |
| [0028](0028-kotlin-compilation-workers.md) | Compilation Kotlin : des processus qu'on tue au timeout | Acceptée |
