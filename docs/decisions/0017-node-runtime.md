# 0017 — Pas de runtime `node` en V1

**Statut** : Acceptée · 2026-10-08 · issue du spike [R1](../spikes.md)

## Contexte

Le runtime `node` devait reposer sur WebContainers, pour les templates qui ont besoin de `npm install`, d'un serveur
HTTP ou d'un Vite complet. La plateforme est sous MIT ([0011](0011-licenses.md)) : n'importe qui peut l'héberger, y
compris une entreprise pour ses équipes. Le spike R1 a lu les conditions en vigueur le 2026-10-08.

**WebContainers** (`@webcontainer/api` 1.6.4) :

- Le paquet npm est sous MIT, mais ce n'est qu'un client. Son README précise que l'API « relies on hosted proxies and
  server-side acceleration from StackBlitz » et que l'intégrer vaut acceptation des conditions d'utilisation de
  StackBlitz.
- Conditions d'utilisation, §1.5(c) : l'usage est soumis aux paliers, aux limites de session et aux autres limites
  publiés. « Use in a production or commercial setting, or beyond the stated limits, requires an active plan or
  separate written license. » L'accès peut être révoqué.
- Page « Commercial Usage » : une licence est requise dès que l'API sert « your customers, prospective customers,
  and/or employees ». L'auto-hébergement n'existe que dans l'offre Enterprise.
- La promesse « always free for open source » de 2023 ne figure plus dans les conditions actuelles.
- Le runtime exige `SharedArrayBuffer` : il ne démarre pas en embed ([0016](0016-isolation-and-embed.md)).

**Nodebox** (`@codesandbox/nodebox` 0.1.9) :

- Sustainable Use License 1.0, qui n'est pas une licence OSI : usage « only for your own internal business purposes
  or for non-commercial or personal use », distribution « only if you do so free of charge for non-commercial
  purposes ».
- Le runtime dépend des serveurs de CodeSandbox, et le paquet n'a plus été publié depuis avril 2025.

**Besoin réel** : les 44 templates du [catalogue](../specs/catalogue.md) tournent sur `browser-js`, `go` ou `kotlin`,
sans aucune dépendance hors bibliothèque standard et outil de test. Aucun n'a besoin de `node`.

## Décision

- **`node` ne fait pas partie de la V1.** Le schéma 1 du manifeste ne l'accepte pas : `runtime.kind` vaut
  `browser-js`, `go` ou `kotlin`.
- **Pas de WebContainers ni de Nodebox comme dépendance de la plateforme.** Chacun rendrait toute instance dépendante
  d'un service tiers. L'instance publique et les instances tierces seraient soumises à une licence qu'on ne contrôle
  pas, et révocable.
- **TS et JS passent par `browser-js`.** Les dépendances npm éventuelles d'un template tiers sont résolues via un CDN
  ESM, comme prévu dans [runtimes](../specs/runtimes.md). Un paquet qui exige des API Node n'est pas supporté en V1.
- On ne contacte pas StackBlitz. Un accord écrit couvrirait au mieux l'instance publique, jamais les instances
  tierces, et ne lèverait ni la dépendance à leurs serveurs ni l'impossibilité de l'embed.

## Conséquences

- R1 ne bloque plus le gel du schéma 1. Ajouter `node` plus tard sera un changement de schéma (`runtime.kind` est une
  énumération fermée), avec une migration sans effet sur les manifestes existants.
- Le package `runtime-node`, le terminal xterm.js et le timeout des processus longs sortent de la V1.
  `vitest-reporter` ne sert plus qu'à la suite de conformité du `test-runner` : il devient interne et n'est plus publié
  sur npm.
- Les templates qui auraient besoin d'un serveur HTTP ou de `npm install` attendent le runner auto-hébergeable (V2).
- Le `RuntimePort` reste le point d'extension. Un adaptateur WebContainers optionnel est envisageable en V2, activé
  par l'opérateur d'une instance sous sa propre licence. Il ne serait jamais actif par défaut.

## Alternatives écartées

- **WebContainers sous accord avec StackBlitz** : ne couvre pas les instances tierces, garde la dépendance réseau,
  coupé de l'embed.
- **Nodebox** : licence non OSI, incompatible avec une plateforme MIT hébergeable commercialement, projet à l'arrêt.
- **Runtime Node maison** (polyfills `fs`, `http` sur `browser-js`) : coût élevé pour un besoin nul dans le catalogue.
- **Garder `node` réservé dans le schéma 1** : fige un contrat (commandes shell, `entry` facultatif) que rien n'a
  validé.
