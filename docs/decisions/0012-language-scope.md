# 0012 — Langages : TS, JS, Go, Kotlin

**Statut** : Acceptée · 2026-10-08

## Contexte

Plusieurs listes ont été envisagées (Python, PHP, Java, C#…), chacune avec un coût de runtime différent.

## Décision

Les langages sont **TypeScript, JavaScript, Go et Kotlin**. Python, PHP, Java, C# et Rust sont hors périmètre.

## Conséquences

- Un seul runtime vraiment lourd (Go) et un service de compilation (Kotlin).
- Kotlin porte la partie POO « classique » que Java ou C# auraient portée.
- Ajouter un langage plus tard = un runtime + des variantes, sans changer le format de template.

## Alternatives écartées

- **Java, C#** : runtimes navigateur lourds ou incertains ; Kotlin couvre le même besoin pédagogique.
- **PHP, Python** : runtimes WASM viables, écartés par choix de périmètre.
