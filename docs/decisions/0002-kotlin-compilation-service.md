# 0002 — Kotlin via un service de compilation

**Statut** : Remplacée par [0019](0019-kotlin-runtime.md) · 2026-10-08

## Contexte

Kotlin est le langage POO de référence du catalogue. Son compilateur est un programme JVM ; aucune version officielle ne
s'exécute dans le navigateur.

## Décision

Un **service de compilation sans état**, basé sur `kotlin-compiler-server`, compile les sources vers Kotlin/JS ou
Kotlin/Wasm. Le navigateur exécute le résultat et les tests `kotlin.test`. Le serveur ne fait que compiler.

Garde-fous : conteneur séparé et désactivable, aucun accès réseau sortant, taille de sources bornée, timeout, rate
limiting par IP, cache par hash des sources.

## Conséquences

- Exception assumée au principe [0001](0001-browser-first.md), limitée à la compilation.
- Les templates Kotlin n'utilisent pas d'API propre à la JVM (`java.*`).
- Une instance sans service de compilation masque les templates Kotlin.
- Un service à opérer, surveiller et protéger (R9).

## Alternatives écartées

- **`kotlinc` dans le navigateur via une JVM WASM (CheerpJ)** : évaluée dans R8 ; plusieurs dizaines de Mo et
  compilation lente. Remplace cette décision si R8 la juge acceptable.
- **Exécution JVM côté serveur** : rejetée, contraire à [0001](0001-browser-first.md).
