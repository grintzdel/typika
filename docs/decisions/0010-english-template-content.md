# 0010 — Contenu des templates en anglais, interface bilingue

**Statut** : Acceptée · 2026-10-08

## Contexte

Le contenu des templates (tours, énoncés) représente l'essentiel du texte et est écrit par des contributeurs.

## Décision

- **Interface** : i18n dès le départ, anglais et français.
- **Contenu des templates** : anglais uniquement en V1. Le format prévoit `tour/<locale>/` optionnel avec repli sur
  l'anglais, activable plus tard.

## Conséquences

- Un contributeur écrit une fois ; pas de traductions qui divergent du code.
- Barrière pour les apprenants non anglophones, à réévaluer selon la demande.

## Alternatives écartées

- **Tours traduits dès la V1** : double la charge de chaque template, traductions qui pourrissent.
