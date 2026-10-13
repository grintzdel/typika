# 0028 — Compilation Kotlin : des processus de compilation qu'on tue au timeout

**Statut** : Acceptée · 2026-10-13 · lot 1 du M6 · complète [0019](0019-kotlin-runtime.md)

## Contexte

Le service `kotlin-compiler` compile du code non fiable avec un timeout de 15 s ([0019](0019-kotlin-runtime.md),
[security §3.3](../specs/security.md)). Le compilateur ne regarde jamais si son thread a été interrompu, et
`Thread.stop` n'existe plus depuis le JDK 20. 0019 laissait deux voies : un processus de compilation séparé, ou le
redémarrage du conteneur.

Une compilation qui dépasse le timeout se fabrique en trois lignes : `fun <T> p(t: T) = Pair(t, t)`, une valeur
imbriquée 24 fois dans `p(...)`, puis une affectation à un `Int`. Le message d'erreur contient alors un type de 2²⁴
nœuds. Chaque niveau double le travail : 11 s à 20 niveaux, bien au-delà de 15 s à 24. Sur le même principe, `const val` doublé 26 fois épuise la mémoire du
compilateur.

Mesures sur `strategy-kotlin` (sources et tests, cache serveur désactivé). Le conteneur est limité à 2 vCPU et 1 Gio,
sans swap. La charge envoie 80 requêtes, 8 à la fois, sur un hôte Apple M4 Pro.

| Variante | Débit saturé | p95 à c = 8 | Mémoire max |
|---|---|---|---|
| Une JVM, deux threads de compilation (spike R8) | 2,2 compil./s | 5,2 s | 656 Mio |
| Deux processus, heap de 320 Mio, C2 | 1,1 compil./s | 9,3 s | 1 Gio (saturée, un worker tué) |
| Deux processus, heap de 192 Mio, C2, cache AOT, `MALLOC_ARENA_MAX=2` | 1,7 compil./s | 7,2 s | 850 Mio |
| **Deux processus, heap de 192 Mio, C1 seul, cache AOT, `MALLOC_ARENA_MAX=2`** | **2,4 compil./s** | **4,1 s** | **815 Mio** |

Avec la dernière variante, une compilation seule prend 0,7 s à chaud, et un worker est prêt 3 s après son lancement.

## Décision

- **Un superviseur et un processus de compilation par place.** Le superviseur est le serveur HTTP. Il lance
  `KOTLIN_COMPILER_CONCURRENCY` workers, chacun une JVM qui compile une requête à la fois. Une requête prend un
  worker libre. Si le worker n'a pas répondu au bout de `KOTLIN_COMPILER_TIMEOUT_MS`, le superviseur le tue,
  répond `504` et en relance un autre. Les autres workers, et la file d'attente, ne sont pas touchés.
- **Un worker qui meurt est remplacé de la même façon.** Les workers tournent avec `-XX:+ExitOnOutOfMemoryError` :
  une compilation qui épuise le heap tue son worker, le superviseur répond `503` et le relance.
- **Le protocole entre le superviseur et ses workers** passe par l'entrée et la sortie standard : des trames JSON
  préfixées par leur longueur. La JVM du worker écrit ses propres logs sur stderr (`-Xlog:disable`
  `-Xlog:all=warning,aot*=error:stderr`). Sans cette redirection, un avertissement de la JVM sur stdout corrompt la
  trame suivante.
- **Chaque worker est chaud dès son lancement.** Il compile un petit projet avec un test avant de se déclarer prêt.
  Le superviseur ne lui confie aucune requête avant.
- **Réglage des workers, mesuré** : heap de 192 Mio, code cache de 48 Mio, C1 seul (`-XX:TieredStopAtLevel=1`),
  SerialGC, pile de 8 Mio. Le cache AOT du JDK 25 est produit au build de l'image, en lançant un worker avec les mêmes
  options. L'image fixe `MALLOC_ARENA_MAX=2`. `KOTLIN_COMPILER_WORKER_JAVA_OPTS` remplace ces options.
- **Le superviseur garde le cache d'artefacts** dans un heap de 96 Mio. Le cache passe de 128 à 32 Mio par défaut, ce
  qui fait environ 150 compilations de `strategy-kotlin`. Le cache client et les artefacts précompilés du registre
  évitent déjà la plupart des appels.

## Conséquences

- Une compilation qui ne finit pas coûte au plus `TIMEOUT_MS` à une place, puis environ 3 s de relance. Le reste du
  service continue de répondre.
- Avec deux places, deux compilations piégées envoyées en même temps bloquent tout le service pendant environ 18 s :
  le timeout, puis la relance. Les compilations suivantes attendent dans la file, puis reçoivent `503` quand elle est
  pleine. Le rate limiting par IP du relais ([0029](0029-kotlin-relay-rate-limit.md)) limite la fréquence à laquelle
  un même client peut recommencer, sans empêcher l'attaque. Un `503` dû à un processus planté porte, comme celui
  d'une file pleine, un `Retry-After: 5`.
- Deux JVM au lieu d'une, mais le débit dépasse celui du spike : le C1 seul compile les méthodes du compilateur plus
  vite que le C2 ne les optimise, sur des compilations d'une seconde. La mémoire tient dans le dimensionnement de
  référence de [0019](0019-kotlin-runtime.md) (2 vCPU, 1 Gio).
- La mémoire grimpe avec le nombre de workers : compter environ 380 Mio par worker, plus 70 Mio pour le
  superviseur.
- L'image pèse 771 Mo, dont 114 Mo de cache AOT. Le cache AOT est lié à la JVM exacte de l'image et à ses options. Une JVM qui refuse le cache démarre quand même,
  seulement plus lentement : le cache est une optimisation, pas une dépendance.
- Les messages de diagnostic sont tronqués à 2 000 caractères. Le type géant de l'exemple ci-dessus produisait des
  réponses de plus de 10 Mo.

## Alternatives écartées

- **Redémarrer le conteneur** : une seule requête piégée coupe le service pour tout le monde, file comprise, pendant
  5 à 11 s. C'est un déni de service à la portée de n'importe qui.
- **Une JVM par compilation** : chaque requête paierait le démarrage et le JIT, soit 5 à 11 s mesurées au spike R8.
- **Des threads dans une seule JVM** : on ne peut pas les interrompre, et un `OutOfMemoryError` dans un thread laisse
  toute la JVM dans un état incertain.
