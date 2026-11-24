# 0035 — Instance publique : Docker derrière Caddy sur un VPS

**Statut** : Acceptée · 2026-11-22 · lot 4 du M7 · complète [hosting §4](../guides/hosting.md)

## Contexte

Le [guide d'hébergement](../guides/hosting.md) décrit deux cibles pour l'instance publique : Docker derrière Caddy,
la cible principale, et Vercel avec le service Kotlin hébergé à part. Le lot 4 du M7 demande d'en retenir une.

Les fichiers de la première existent depuis le M1 (`Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`), et le
profil Compose `kotlin` depuis le lot 3 du M6. La CI construit l'image et joue les E2E de production dessus. Pour
Vercel, rien n'est écrit : les en-têtes par hôte et par chemin, le relais `/api/kotlin` et sa limite de débit, que le
serveur Node de l'app porte aujourd'hui ([0029](0029-kotlin-relay-rate-limit.md)), seraient à réécrire en
configuration et en fonctions Vercel, et le service Kotlin demanderait de toute façon une machine à part.

## Décision

- L'instance publique tourne sur **un VPS**, avec `docker compose --profile kotlin` : Caddy, `web` et
  `kotlin-compiler` sur la même machine. Le choix est celui du mainteneur (2026-11-22).
- L'image est **construite sur la machine**, depuis un clone complet du dépôt (`docker compose up -d --build`). Une
  mise à jour de l'app ou une publication du registre se déploie par `git pull` suivi de la même commande.
- Caddy publie aussi `443/udp` : il annonce HTTP/3 dans `Alt-Svc`, et sans ce port l'annonce ne mène nulle part.
- Les deux domaines sont deux sites différents ([security §2.1](../specs/security.md)). Ils seront choisis avec le
  nom de domaine de #92.
- La checklist de [hosting §9](../guides/hosting.md) se répète sur une instance locale de la même pile, en HTTPS,
  avec l'autorité interne de Caddy et deux noms en `.localhost` ([hosting §4.6](../guides/hosting.md)).

## Conséquences

- Une seule cible est maintenue et testée. [hosting §5](../guides/hosting.md) reste une piste pour qui voudrait
  héberger sa propre instance sur Vercel, sans rien de livré.
- Le dépôt reste public : la machine clone sans identifiant.
- Le hub prérendu suit le registre au rythme des reconstructions. Tant que personne ne reconstruit, l'accueil et la
  liste montrent l'index du build ([0023](0023-hub-prerendering.md)). Le déclenchement automatique après une
  publication du registre attend le lot 5, quand le dépôt du registre existera.
- La construction partage la machine avec le service Kotlin, plafonné à 2 CPU et 1 Gio. Mesurée le 2026-11-22 dans
  un builder limité à 2 CPU, sans swap, sur arm64 : l'image `web` demande environ 2 Gio de mémoire vive (elle se
  construit sous 3 Gio en 2 min 20, et est tuée sous 2 Gio), l'image `kotlin-compiler` environ 1,5 Gio (elle se
  construit sous 2 Gio en 40 s, et est tuée sous 1 Gio). Une machine de **4 Gio avec du swap** est donc le minimum
  pour construire pendant que la pile tourne, qui occupe environ 525 Mio au repos ; 2 Gio ne suffisent pas. Les
  durées sur un VPS x86 et la mémoire de la pile sous charge restent à relever au lot 5, sur la machine réelle.
- Pas de retour arrière outillé : revenir à une version, c'est `git checkout <commit>` puis reconstruire.

## Alternatives écartées

- **Vercel et le service Kotlin à part** : deux déploiements à relier, un relais et des en-têtes à réécrire et à
  tester une seconde fois, pour une app dont le serveur fait déjà ce travail derrière n'importe quel proxy.
- **Tirer l'image depuis un registre de conteneurs** (GHCR), construite par la CI : la machine ne construirait plus,
  et le retour arrière serait un changement de tag. Cela publie un artefact de plus, à signer et à garder en phase
  avec le registre des templates, dont l'index est figé dans l'image. À reconsidérer si la construction sur place
  gêne le service, ou pour une machine de moins de 4 Gio : elle n'aurait plus que la pile à faire tourner.
- **Une IP comme second site pour la répétition locale** (`127.0.0.1`, comme dans les essais en HTTP) : en HTTPS un
  client n'envoie pas de SNI pour une IP, et Caddy, qui voit l'adresse du conteneur, ne trouve pas le certificat.
