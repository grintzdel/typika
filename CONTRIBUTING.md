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
- `pnpm lint`, `pnpm format:check`, `pnpm test` et `pnpm template-check` doivent passer. `template-check` valide chaque
  template de `templates/` (manifeste, refs `[base]` et `[variants]`, ancres du tour) et exécute les états de départ et
  de solution des exercices `browser-js`, `go` et `kotlin` dans Node, avec le bundler, le runner, le pilote Go et le
  harness Kotlin de la sandbox.
  Les tests de `runtime-browser-js` tournent dans Chromium, ceux du navigateur de `runtime-go` et l'E2E Go de l'app dans
  Chromium et WebKit : installez-les une fois avec `pnpm --filter @typika/runtime-go exec playwright install chromium
  webkit`.
- Go : les assets du runtime `go` se reconstruisent avec le Go installé, qui doit être en version 1.24.5. Le contrôle
  local, `template-check`, `registry:build` et le build Docker s'en chargent ; une reconstruction complète prend
  environ 100 s et elle est sautée quand rien n'a changé. Le serveur de dev de l'app sert les assets déjà construits.
- Kotlin : les tests de `services/kotlin-compiler`, de `runtime-kotlin` et de `template-check` construisent l'image du
  service et la lancent en conteneur ; Docker doit tourner. `KOTLIN_COMPILER_URL` fait viser aux deux derniers un
  service déjà lancé. La suite de conformité de `runtime-kotlin` compare ses résultats à `gradle test` et `gradle run` : elle
  demande Gradle 9 et un JDK 25 en local. Le service lui-même se compile dans l'image.
  `KOTLIN_COMPILER_URL=http://… pnpm template-check` lance aussi les exercices Kotlin, comme `pnpm registry:build` et
  `pnpm registry:health`. Avec le service, `pnpm registry:build` compile aussi les artefacts des templates Kotlin
  dans `registry/artifacts/kotlin/` : relancez-le et commitez-les quand une entrée Kotlin change d'épinglage. Le run
  de santé ne sonde Kotlin que sur une app lancée avec `KOTLIN_COMPILER_URL` ; au-delà de quelques templates, levez sa
  limite par IP (`TYPIKA_KOTLIN_RATE_PER_MINUTE`, `TYPIKA_KOTLIN_RATE_BURST`).
  `KOTLIN_COMPILER_URL=http://127.0.0.1:3080 pnpm --filter @typika/web dev` active Kotlin dans l'app, avec le service
  lancé par `node apps/web/scripts/serve-kotlin-compiler.ts 3080` ; l'E2E de dev fait les deux tout seul.
- App : `pnpm --filter @typika/web dev` sert l'app sur `http://localhost:3000` et la runtime frame sur
  `http://127.0.0.1:3001`. Les tests E2E (`pnpm --filter @typika/web test:e2e`) démarrent ce serveur s'il ne tourne
  pas déjà.
- Production : `pnpm --filter @typika/web test:e2e:production` construit l'app, lance le serveur de production sur le
  port 3100 et vérifie les en-têtes de chaque route. Contre une autre instance (l'image Docker, par exemple), passez
  `TYPIKA_E2E_APP_URL` et `TYPIKA_E2E_RUNTIME_URL` ([hosting](docs/guides/hosting.md) §4.4).
- Messages de commit en anglais, à l'impératif.

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous licence MIT (plateforme) ou MIT-0 (templates
officiels) — voir [0011](docs/decisions/0011-licenses.md).
