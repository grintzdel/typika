# Contribuer

Typika est en phase de conception : les contributions les plus utiles aujourd'hui portent sur la documentation et le
catalogue.

## Discuter d'une idée

Ouvrez une issue avant tout changement important. Pour remettre en cause une décision, référencez l'ADR concerné
([decisions](docs/decisions/README.md)) : une décision acceptée se remplace par un nouvel ADR, elle ne se réécrit pas.

## Proposer un template

1. Lire le [guide d'écriture](docs/guides/template-authoring.md) et le [catalogue](docs/specs/catalogue.md).
2. Ouvrir une issue pour vérifier que le concept et le langage correspondent au catalogue.
3. Une fois le registre en place (M3), publier par une PR au dépôt registre — voir [registry](docs/specs/registry.md).

## Contribuer au code

À partir du M1 :

- Architecture et conventions : [architecture](docs/specs/architecture.md).
- TDD : tests E2E puis tests unitaires rouges avant l'implémentation.
- `pnpm lint`, `pnpm format:check` et `pnpm test` doivent passer.
- Messages de commit en anglais, à l'impératif.

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous licence MIT (plateforme) ou MIT-0 (templates
officiels) — voir [0011](docs/decisions/0011-licenses.md).
