# 0003 — Templates statiques en V1

**Statut** : Acceptée · 2026-10-08

## Contexte

Deux modèles possibles : un template est un projet figé, ou il se compose d'une base et d'add-ons (`ts-base + vitest +
effect + cqrs`).

## Décision

En V1, un template est un **projet statique**. La composition viendra éventuellement en V2 sous forme de stacks curées,
avec des contraintes de compatibilité déclarées.

## Conséquences

- Chaque template est testé tel qu'il est servi : la santé affichée est vraie.
- Duplication entre templates proches, acceptée.
- Le format du manifeste ne prévoit pas la composition ; l'ajouter sera une évolution de `schema`.

## Alternatives écartées

- **Composition libre** : explosion combinatoire, la plupart des combinaisons ne seraient jamais testées.
