# Documentation

## Par où commencer

1. [Vision](vision.md) — pourquoi, pour qui, ce qui est dans le périmètre et ce qui n'y est pas.
2. [Roadmap](roadmap.md) — les jalons et leur critère de fin.
3. [Décisions](decisions/README.md) — les choix structurants et leurs raisons.

## Produit

| Document | Contenu |
|---|---|
| [Catalogue](specs/catalogue.md) | Les 16 concepts initiaux, leur base, tour, exercices et couverture par langage |
| [UI](specs/ui.md) | Écrans, routes, interactions, accessibilité |
| [Registre](specs/registry.md) | Publication, index, CI de santé, gouvernance |
| [Partage et CLI](specs/sharing-and-cli.md) | Persistance locale, partage, export, `typika create` |

## Technique

| Document | Contenu |
|---|---|
| [Manifeste](specs/manifest.md) | Spec normative de `typika.toml` |
| [Runtimes](specs/runtimes.md) | Contrat `RuntimePort`, runtimes `browser-js`, `node`, `go`, `kotlin` |
| [Architecture](specs/architecture.md) | Monorepo, modules, flux de données, tests |
| [Sécurité](specs/security.md) | Modèle de menaces et mitigations |
| [Spikes](spikes.md) | Questions ouvertes à trancher au M0 |

## Guides

| Document | Pour |
|---|---|
| [Écrire un template](guides/template-authoring.md) | Auteurs de templates |
| [Héberger Typika](guides/hosting.md) | Déploiement Docker, Vercel, autres |
| [Contribuer](../CONTRIBUTING.md) | Contributeurs |

## Historique

[Spec de conception initiale](specs/2026-10-08-typika-v1-design.md) : trace des discussions qui ont mené aux documents
ci-dessus. En cas de divergence, les documents dédiés et les ADR font foi.
