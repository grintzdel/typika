# 0029 — Compilation Kotlin : relayée et limitée par le serveur de l'app

**Statut** : Acceptée · 2026-10-13 · lot 3 du M6 · traite R9 · complète [0019](0019-kotlin-runtime.md) et
[0028](0028-kotlin-compilation-workers.md)

## Contexte

Le service `kotlin-compiler` compile du code non fiable et coûte cher : environ une seconde de CPU et plusieurs
centaines de Mio par compilation ([0028](0028-kotlin-compilation-workers.md)). Il borne lui-même sa concurrence, sa
file, son corps et son timeout, mais ne distingue pas les clients : une seule machine peut occuper toute la file et
faire répondre `503` à tous les autres. [security §3.3](../specs/security.md) demande un rate limiting par IP ; le
guide d'hébergement laissait le choix entre un module Caddy tiers et une limitation dans le service (R9).

Trois contraintes pèsent sur ce choix :

- **L'appel part de l'app**, pas de la runtime frame, qui n'a pas d'accès réseau sortant
  ([runtimes §6.4](../specs/runtimes.md)). Il doit donc viser une URL que la CSP de l'app autorise.
- **L'app tourne sans Caddy** en dev (serveur Vite) et dans l'E2E de production (`node dist/node/main.js`). Un routage
  porté par Caddy seul laisse ces deux contextes sans chemin vers le service.
- **Caddy ne limite pas le débit** sans module tiers : il faudrait construire et suivre une image Caddy à part
  (`xcaddy` + `caddy-ratelimit`).

## Décision

- **Le serveur de l'app relaie `POST /api/kotlin/compile`** vers le service désigné par `KOTLIN_COMPILER_URL`, une
  adresse interne qui n'est jamais exposée. La config publique ne donne que `kotlinCompilerUrl: "/api/kotlin"` :
  l'appel reste sur l'origine de l'app, sans CORS et sans entrée de plus dans `connect-src`. Le même relais tourne
  dans le serveur de dev Vite.
- **Rate limiting par IP dans ce relais** : un seau de jetons par client, 20 compilations par minute et 10 d'avance
  par défaut (`TYPIKA_KOTLIN_RATE_PER_MINUTE`, `TYPIKA_KOTLIN_RATE_BURST`). Au-delà : `429` et `Retry-After`. Au plus
  10 000 clients suivis ; les seaux pleins sont oubliés en premier.
- **L'IP du client** est celle de la connexion, ou le dernier `X-Forwarded-For` quand `TYPIKA_TRUST_PROXY=true` :
  Caddy y ajoute l'adresse qu'il voit. Ne l'activer que derrière un proxy qui réécrit cet en-tête.
- Le relais refuse aussi ce que le service refuserait de toute façon, avant de le solliciter : une autre route
  (`404`), une autre méthode (`405`), un `Origin` d'un autre site (`403`), un corps de plus de 256 Kio (`413`). Il
  transmet le statut et le `Retry-After` du service, et répond `503` si le service est injoignable.
- Le service reste joignable seulement par l'app, sur le réseau interne de Compose, sans route Caddy.

## Conséquences

- Écart avec la roadmap, qui prévoyait `/api/kotlin/*` « routé par Caddy ». Caddy reste l'image officielle et ne voit
  que `web`.
- Les compilations traversent Node : quelques dizaines de Kio de JSON par appel, sans coût notable à côté de la
  compilation elle-même.
- Le compteur vit dans le processus `web` : il repart de zéro à chaque redémarrage et ne se partage pas entre
  plusieurs instances. Une instance par déploiement suffit en V1.
- Le cache client (IndexedDB) et les artefacts précompilés (lot 4) évitent la plupart des appels : la limite ne
  touche que les modifications répétées.
- Une instance qui expose le service ailleurs (Vercel, [hosting](../guides/hosting.md) §5) doit mettre son propre
  rate limiting devant.

## Alternatives écartées

- **Caddy + `caddy-ratelimit`** : une image Caddy maison à construire et à suivre, et rien en dev ni dans l'E2E de
  production.
- **Limitation dans le service Kotlin** : plus de code JVM dans le service exposé au code non fiable, et un relais
  restait nécessaire en dev.
- **Pas de limitation par IP** : la file bornée du service protège la machine, pas les autres utilisateurs.
