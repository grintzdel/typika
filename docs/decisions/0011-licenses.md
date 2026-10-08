# 0011 — Licences

**Statut** : Acceptée · 2026-10-08

## Contexte

Le projet est open source. Les templates sont faits pour être copiés dans des projets, y compris propriétaires.

## Décision

- **Plateforme** (app, packages, CLI, service) : **MIT**.
- **Templates officiels** (`typika/*`) : **MIT-0**, sans obligation d'attribution.
- **Templates tiers** : licence approuvée OSI au choix de l'auteur, déclarée dans le manifeste et affichée ; le registre
  refuse les templates sans licence.

## Conséquences

- Aucune friction pour réutiliser un template via `typika create`.
- Rien n'empêche un tiers d'héberger une version fermée de la plateforme.

## Alternatives écartées

- **Apache-2.0** : clause brevets peu utile ici, texte plus lourd.
- **AGPL** : protège contre un fork SaaS fermé mais freine contributions et intégrations.
