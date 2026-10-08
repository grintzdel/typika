# 0004 — Registre Git et index statique

**Statut** : Acceptée · 2026-10-08

## Contexte

Le hub doit lister, classer et décrire les templates. Une base de données et une API seraient le réflexe habituel.

## Décision

Le registre est un **dépôt Git** : une PR ajoute une entrée. Sa CI résout les manifestes, calcule la santé et publie un
`index.json` statique. Le contenu des templates reste dans leurs propres dépôts. Voir [registry](../specs/registry.md).

## Conséquences

- Pas de base de données ni d'API à héberger ; gouvernance transparente (historique Git, revue de PR).
- Publier un template demande une PR : friction voulue, qui sert la curation.
- La fraîcheur de l'index dépend de la fréquence de la CI.

## Alternatives écartées

- **Base de données + API de publication** : coût, comptes, modération, sans bénéfice pour un catalogue curé.
