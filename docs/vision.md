# Vision

## Le problème

Apprendre un pattern d'architecture ou un design pattern, aujourd'hui, c'est lire un article, regarder un diagramme UML
et un extrait de code de 30 lignes sorti de son contexte. On comprend la forme, rarement la raison d'être :

- on ne voit pas **le problème** que le pattern résout, parce que le code « avant » n'est jamais montré ;
- on ne peut pas **toucher** : modifier, casser, ajouter une exigence et sentir où le code résiste ;
- on ne voit pas ce que le pattern devient **dans un autre langage**, où il est parfois inutile.

Les sandboxes existantes (CodeSandbox, StackBlitz, Replit) exécutent du code mais ne sont pas pensées pour enseigner.
Les starters et générateurs de projets fournissent une structure sans l'expliquer.

## La proposition

Typika est un **hub open source et gratuit de templates exécutables**, classés par langage, framework, librairie et
surtout **par concept** : architecture, principes, design patterns, fondamentaux de la POO.

Chaque template est un vrai projet qu'on ouvre et exécute dans le navigateur, accompagné de :

- une **base** : le même code sans le pattern, pour voir le problème ;
- une **visite guidée** ancrée dans le code ;
- des **exercices** dont le meilleur type est le `refactor` : une nouvelle exigence pénible dans la base, triviale une
  fois le pattern en place ;
- des **variantes** dans d'autres langages, comparables côte à côte.

Le hub est le produit ; la sandbox est le moyen de l'explorer. Un template reste utile hors de Typika :
`typika create <template>` le copie dans un vrai projet.

## Pour qui

| Profil | Rôle | Ce qu'il attend |
|---|---|---|
| **Développeur intermédiaire qui apprend l'architecture** | Cible primaire | Comprendre CQRS, l'hexagonal, SOLID, les patterns GoF par la pratique. |
| **Auteur de contenu** (blog, doc, formation) | Canal | Embarquer un exemple exécutable dans un article. Chaque embed amène des apprenants. |
| **Développeur qui prototype** | Non ciblé | StackBlitz et CodeSandbox le servent mieux. |

**Règle d'arbitrage** : en cas de conflit, la fonctionnalité qui sert l'apprenant gagne.

## Principes

1. **Navigateur d'abord.** Le code s'exécute côté client. Seule exception : un service de compilation sans état quand
   aucun compilateur ne tourne dans le navigateur (Kotlin). Le serveur compile, il n'exécute jamais.
2. **Zéro backend métier.** Pas de base de données, pas de comptes. Le hub est un index statique généré depuis un dépôt
   Git.
3. **Sans compte par défaut.** GitHub OAuth uniquement pour créer un gist, publier ou pousser vers un dépôt.
4. **Pédagogie avant exhaustivité.** Peu de templates, chacun excellent. Pas d'objectif de volume.
5. **Santé visible.** Chaque template est testé en continu ; un template cassé se voit et finit déprécié.
6. **Le langage fait partie de la leçon.** Une variante n'est pas une traduction : quand un pattern se dissout dans un
   langage, la variante le montre.
7. **Pas à pas.** Pas de date ni de lancement ; chaque jalon livre quelque chose d'utilisable.

## Périmètre

### Inclus

- Langages : **TypeScript** (référence, tout le catalogue), **JavaScript**, **Go**, **Kotlin**.
- Catalogue initial : 5 architectures, 5 principes SOLID, 5 design patterns GoF, 1 fondamental POO
  ([catalogue](specs/catalogue.md)).
- Hub à facettes, page template, sandbox, visites guidées, diff depuis la base, exercices, comparaison, embed, partage,
  export, CLI.
- Interface en anglais et en français ; contenu des templates en anglais.

### Exclu (V2 ou jamais)

| Sujet | Statut |
|---|---|
| Python, PHP, Java, C#, Rust | Hors périmètre ; réévaluable plus tard. |
| Collaboration temps réel | V2 si besoin. |
| Génération de templates par IA | Non : brouille le positionnement. |
| Exécution serveur | Non sur l'instance publique ; runner auto-hébergeable en V2. |
| Templates composables (base + add-ons) | V2, sous forme de stacks curées. |
| Comptes utilisateurs, base de données | Non. |

## Glossaire

| Terme | Définition |
|---|---|
| **Template** | Projet de référence décrit par un manifeste `typika.toml`, vivant dans un dépôt Git. |
| **Manifest** | Métadonnées, facettes, runtime, commandes, tour, exercices, variantes, base. Voir [manifest](specs/manifest.md). |
| **Facet** | Axe de classement : `language`, `framework`, `library`, `paradigm`, `topic`, `level`, `useCase`. |
| **Topic** | Ce que le template enseigne : `architecture/…`, `principle/…`, `design-pattern/<famille>/…`, `fundamental/…`. |
| **Base** | Template « avant » dont le template dérive. Alimente la vue diff. |
| **Variant** | Le même concept dans un autre langage. Alimente la comparaison. |
| **Tour** | Suite d'étapes Markdown ancrées sur des fichiers et des lignes. |
| **Exercise** | `fix` : faire passer des tests rouges. `refactor` : ajouter une exigence qui n'est simple qu'après restructuration. |
| **Project** | Copie locale (IndexedDB) d'un template, modifiable. |
| **Runtime** | Environnement d'exécution : `browser-js`, `node`, `go`, `kotlin`. Voir [runtimes](specs/runtimes.md). |
| **Registry** | Dépôt Git qui référence les templates publiés. Voir [registry](specs/registry.md). |
| **Health** | `healthy`, `degraded`, `broken`, `deprecated`, calculé par la CI du registre. |

## Le nom

Typika vient du grec *typos* : l'empreinte, le modèle qu'on reproduit, d'où vient le mot « type ». Un template est
exactement cela. Le projet s'appelait d'abord Temenos, nom abandonné à cause de Temenos AG, puis Palaestra, dont le
nom était déjà pris sur npm ([ADR 0014](decisions/0014-name-typika.md)).
