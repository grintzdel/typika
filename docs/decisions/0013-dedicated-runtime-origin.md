# 0013 — Origine dédiée à l'exécution

**Statut** : Acceptée · 2026-10-08

## Contexte

Le code des templates est non fiable : n'importe qui peut ouvrir un lien de partage contenant du code arbitraire.
L'app, elle, détient le token GitHub de l'utilisateur et ses projets en IndexedDB.

## Décision

Le code s'exécute dans une **runtime frame servie depuis une autre origine** (`TYPIKA_RUNTIME_ORIGIN`), chargée en
iframe par l'app et reliée par un `MessageChannel`. L'origine app n'exécute jamais de code utilisateur ; l'origine
runtime ne détient aucun secret.

- Instance publique : l'origine runtime est un **site différent** (domaine distinct).
- Instance privée : un sous-domaine est toléré, avec avertissement.

Détails : [security](../specs/security.md) §2, [hosting](../guides/hosting.md).

## Conséquences

- Un lien partagé malveillant ne peut ni lire le token GitHub ni les autres projets.
- Deux domaines à configurer pour une instance publique.
- Toute communication app ↔ runtime passe par un protocole de messages explicite, testable.
- L'embed (R2) doit être validé avec cette architecture d'iframes imbriquées.

## Alternatives écartées

- **Exécution dans des workers de l'origine app** : un worker partage le stockage de l'origine (IndexedDB) — un
  template malveillant pourrait lire les projets et le token.
- **Sous-domaine obligatoire partout** : insuffisant pour une instance publique (same-site).
