# 0007 — Pas de backend métier

**Statut** : Acceptée · 2026-10-08

## Contexte

La stack habituelle comprend Nitro (routes API), Drizzle, Neon, des commands / queries serveur et une authentification.

## Décision

Typika n'a **pas de backend métier** : ni base, ni comptes, ni commands / queries serveur. L'application est un build
statique (TanStack Start, hub prérendu pour le référencement, sandbox en SPA) plus un unique endpoint
`POST /api/github/token` pour l'échange OAuth, sans stockage.

## Conséquences

- Hébergement trivial (VPS Docker, Vercel ou autre) — voir [hosting](../guides/hosting.md).
- Les fonctionnalités qui demanderaient un état partagé (likes, commentaires, statistiques) sont exclues ou déléguées à
  GitHub.

## Alternatives écartées

- **Backend complet sur la stack habituelle** : aucun cas d'usage V1 ne le justifie.
