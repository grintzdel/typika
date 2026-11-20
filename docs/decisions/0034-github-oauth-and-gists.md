# 0034 — GitHub : OAuth App, échange sur le serveur de l'app, gist lisible

**Statut** : Acceptée · 2026-11-20 · lot 6 du M5 · complète [sharing-and-cli §3, §5](../specs/sharing-and-cli.md) et
[security §3.5](../specs/security.md)

## Contexte

Le lot 6 apporte le partage par gist et le push vers un nouveau dépôt. Les specs laissaient ouverts le type
d'application GitHub, la place de l'endpoint d'échange, la façon de revenir dans la sandbox après la connexion, et le
format d'un projet dans un gist. Il n'y a ni instance publique ni application de production (#92) : tout doit se
tester sans GitHub.

Vérifié le 2026-11-20 : GitHub accepte PKCE (`S256`) pour les OAuth Apps et les GitHub Apps depuis juillet 2025, mais
l'échange `code` → jeton demande toujours le `client_secret`, et `github.com/login/oauth/access_token` ne répond pas
en CORS. `api.github.com` répond en CORS.

## Décision

- **OAuth App.** Scopes demandés à l'action : `gist` pour partager, `public_repo` en plus pour pousser. Jamais `repo`
  en V1 : le push ne crée que des dépôts publics.
- **PKCE et `state`.** Le client tire un `state` et un `code_verifier`, gardés en `sessionStorage` le temps de
  l'aller-retour. Le callback refuse un `state` inconnu.
- **L'échange vit dans le serveur Node de l'app**, `POST /api/github/token`, comme le relais Kotlin
  ([0029](0029-kotlin-relay-rate-limit.md)), avec le même middleware en dev. Il refuse un `Origin` autre que l'app,
  limite par IP, et ne journalise ni le `code` ni le jeton. Il n'existe que si `GITHUB_CLIENT_ID` et
  `GITHUB_CLIENT_SECRET` sont définis ; `/config.json` publie alors `github.clientId`.
- **Redirection pleine page, pas de popup.** « Se connecter à GitHub » quitte la page vers GitHub, qui revient sur
  `/auth/github/callback`. Le callback échange le code, range le jeton en `sessionStorage`, puis retourne à la page de
  départ, où le dialogue de partage se rouvre.
- **`TYPIKA_GITHUB_URL` et `TYPIKA_GITHUB_API_URL`** remplacent `https://github.com` et `https://api.github.com`. Les
  E2E les pointent sur un faux GitHub local (`scripts/serve-fake-github.ts`) ; une instance GitHub Enterprise s'en
  sert aussi. L'origine de l'API entre dans `connect-src`.
- **Un gist porte les fichiers complets**, pour qu'il se lise sur GitHub. Un gist est plat : `/` devient `__` dans le
  nom du fichier, avec un suffixe en cas de collision. `typika.share.json` porte la version du format, le nom, la ref
  d'origine, le runtime, l'exercice, la table nom de fichier → chemin, et la liste des fichiers vides, que l'API des
  gists refuse.
- **`/g/<gistId>`** lit le gist sans connexion, et avec le jeton s'il y en a un. Le projet s'ouvre comme un lien
  `/s#…` : sandbox éphémère, bandeau, aucune exécution automatique, id local dérivé de l'id du gist. Comme pour un
  lien, l'origine doit être un template de l'index, en attendant les projets `blank`.
- **Re-partager** met à jour le gist dont l'id est gardé sur le projet local (`projects.gistId`). Un projet ouvert
  depuis le gist de quelqu'un d'autre, ou jamais enregistré, crée un nouveau gist.
- **Deux PR** : (a) connexion, gist et `/g/<id>` ; (b) push vers un nouveau dépôt.

## Conséquences

- Sans application OAuth, rien ne change : le dialogue de partage ne propose que le lien, et `/g/<id>` reste lisible.
- L'OAuth App de développement se crée à la main sur le compte du mainteneur, avec le callback
  `http://localhost:3000/auth/github/callback`. Le contrôle local ne parle jamais au vrai GitHub : la vérification
  contre GitHub se fait à la main, comme les zips du lot 3.
- La redirection recharge la sandbox. Un projet modifié est déjà enregistré ; un projet partagé non modifié se rouvre
  par son URL.
- `public_repo` donne l'écriture sur tous les dépôts publics de l'utilisateur. C'est le plus petit scope d'une OAuth
  App qui crée un dépôt ; l'UI le dit avant la connexion et donne le lien de révocation.
- Un fichier de gist tronqué par l'API (plus de 1 Mo) rend le gist illisible pour Typika : écran d'erreur. Les
  limites d'un projet sont bien en dessous.

## Alternatives écartées

- **GitHub App** : permissions plus fines, mais créer un dépôt exige d'installer l'app sur le compte avec
  l'administration des dépôts. C'est une étape de plus, pour un droit plus large que `public_repo`.
- **Popup** : la sandbox envoie `Cross-Origin-Opener-Policy: same-origin`, qui coupe le lien avec une fenêtre partie
  sur GitHub. Il faudrait un `BroadcastChannel`, et composer avec les bloqueurs de popups.
- **Device flow** : sans secret ni callback, mais l'utilisateur recopie un code, et l'endpoint ne répond pas en CORS
  non plus.
- **Server route TanStack Start** ([architecture §3.5](../specs/architecture.md)) : le limiteur de débit et l'IP du
  client vivent dans le serveur Node, comme pour le relais Kotlin.
- **Un delta dans le gist**, comme dans l'URL : plus petit, mais illisible sur GitHub.
