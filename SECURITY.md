# Politique de sécurité

## Signaler une vulnérabilité

Ne créez pas d'issue publique. Utilisez le signalement privé de GitHub :
[Signaler une vulnérabilité](https://github.com/typika-app/typika/security/advisories/new) (onglet **Security** du dépôt,
puis **Report a vulnerability**). Le rapport n'est visible que par vous et les mainteneurs.

Un bon rapport contient :

- ce qui est touché : l'app, la runtime frame, le service de compilation Kotlin, le CLI, un template ou le registre ;
- les étapes pour reproduire, avec si possible un projet ou un lien de partage minimal ;
- ce qu'un attaquant y gagne.

Typika est maintenu bénévolement. Attendez une première réponse sous une semaine. Le correctif est publié avec un avis
de sécurité, qui vous crédite si vous le souhaitez.

## Versions suivies

Seule la branche `main` reçoit des correctifs, comme l'instance publique qui en est construite. Une instance
auto-hébergée se corrige en reconstruisant son image depuis `main`.

## Périmètre

Le [modèle de menaces](docs/specs/security.md) dit ce que Typika protège. Sont notamment des vulnérabilités :

- du code exécuté dans la sandbox qui lit le token GitHub, les projets locaux ou toute donnée de l'origine app ;
- un template, un lien de partage ou un gist qui exécute du code sans action du visiteur, hors templates du registre ;
- du HTML ou du JavaScript d'un tour ou d'un manifeste rendu sur l'origine app ;
- une requête au service de compilation Kotlin qui sort de son conteneur, lit des fichiers ou épuise l'hôte malgré ses
  limites ;
- un contournement des validations du registre qui fait accepter un template non épinglé ou falsifié.

N'en sont pas :

- du code qui gèle ou fait planter l'onglet de celui qui le lance : la sandbox l'isole, elle ne l'empêche pas ;
- ce que fait le code d'un template une fois téléchargé et lancé hors de Typika ;
- les limites de débit d'une instance auto-hébergée, qui relèvent de son opérateur.
