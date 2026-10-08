# 0001 — Exécution dans le navigateur

**Statut** : Acceptée · 2026-10-08

## Contexte

Typika est gratuit et open source. Exécuter le code des utilisateurs côté serveur coûte du compute, attire les abus
(minage, spam, scans) et impose une modération. C'est le principal risque économique d'un outil gratuit.

## Décision

Tout le code des templates s'exécute **dans le navigateur** : esbuild-wasm et test runner en worker pour TS / JS,
runtime WASM pour Go. L'instance publique ne paie aucune exécution.

## Conséquences

- Coût d'hébergement quasi nul, fonctionnement hors ligne, pas de surface d'abus côté exécution.
- Runtimes lourds à télécharger (R3) : lazy-load, cache, CDN.
- Pas de base de données réelle : PGlite et SQLite WASM comme dépendances de template.
- Les langages sans runtime navigateur demandent soit un service de compilation ([0002](0002-kotlin-compilation-service.md)),
  soit le runner auto-hébergeable (V2).

## Alternatives écartées

- **Exécution serveur (microVMs, conteneurs)** : tous les langages, mais coût et abus incompatibles avec la gratuité.
- **Hybride avec exécution serveur publique** : même problème, à moindre échelle.
