# 0005 — Recherche et filtres côté client

**Statut** : Acceptée · 2026-10-08

## Contexte

Les règles habituelles du projet imposent que tout filtre passe par une requête backend. Typika n'a pas de backend
métier ([0004](0004-git-registry-static-index.md)).

## Décision

La recherche plein texte et les facettes du hub s'exécutent **côté client** sur `index.json` (MiniSearch ou Orama).
Dérogation explicite à la règle « pas de filtre côté client ».

## Conséquences

- Recherche instantanée et disponible hors ligne.
- Valable tant que l'index tient en mémoire (quelques centaines d'entrées). Au-delà de quelques milliers, réévaluer
  (index découpé par facette, ou recherche serveur).

## Alternatives écartées

- **Service de recherche** : réintroduit un backend pour un volume qui n'en a pas besoin.
