# 0014 — Nom : Typika

**Statut** : Acceptée · 2026-10-08 · recherche de marques formelle à faire au M0 ([R6](../spikes.md))

## Contexte

Le projet s'appelait Temenos. Temenos AG est un éditeur de logiciels bancaires coté en bourse : utiliser le même nom
pour un logiciel exposait à un conflit de marque et nuisait à la recherche du projet en ligne. Le nom suivant,
Palaestra, était déjà pris comme compte npm, ce qui interdisait le scope `@palaestra`.

## Décision

Le projet s'appelle **Typika**, du grec *typos* : l'empreinte, le modèle qu'on reproduit, d'où vient le mot « type ».
Un template est exactement cela : un modèle qu'on étudie, puis qu'on reproduit dans son propre projet.

| Élément | Valeur | Disponibilité au 2026-10-08 |
|---|---|---|
| Paquet CLI | `typika` | Libre sur npm |
| Scope des paquets | `@typika/*` | Aucun compte ni paquet `typika` sur npm |
| Domaine | `typika.dev` | Libre (`typika.io` aussi) |
| GitHub | `grintzdel/typika` pour commencer, organisation `typika` plus tard | Aucun compte ni organisation `typika` |
| Manifeste | `typika.toml` | — |
| Variables d'environnement | `TYPIKA_*` | — |

## Conséquences

- Toute la documentation est renommée ; les noms abandonnés n'apparaissent plus que dans cet ADR, la vision, les
  spikes et la spec initiale.
- Le dépôt vit sous le compte personnel jusqu'à ce que l'organisation `typika` soit nécessaire (registre et dépôt de
  templates séparés, au M3).
- Réserver le domaine et le scope npm avant toute communication.

## Alternatives écartées

- **Temenos** : risque de marque face à Temenos AG.
- **Palaestra** (« lieu d'entraînement ») : compte npm `palaestra` déjà pris.
- **Paradeigma**, **Gymnasion** : comptes GitHub déjà pris ; Paradeigma est en plus long et confondu avec *paradigma*.
- **Patternhall** : libre partout, clair, mais long et sans la profondeur du mot grec. Premier nom de repli.
- **Deigmata** (« exemples ») : libre partout, mais trop proche de Digma et Denigma, deux outils pour développeurs.
