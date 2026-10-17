# 0030 — Exercices Kotlin : leur état de départ est précompilé

**Statut** : Acceptée · 2026-10-17 · revue du M6 · tranche #98 · complète [0019](0019-kotlin-runtime.md)

## Contexte

`registry-tools build` précompile chaque template Kotlin, sans son dossier `exercises/`, en modes `test` et `run`
([runtimes §6.4](../specs/runtimes.md)). Ouvrir un template et lancer ses tests ne coûte donc aucun appel au service
de compilation. Un exercice part d'un autre état : celui du template ou de sa base, plus la surcouche `start/`. Sa clé
de cache diffère, et la première action sur un exercice, lancer les tests pour les voir échouer, passait par le relais
limité en débit ([0029](0029-kotlin-relay-rate-limit.md)).

Mesure sur le registre du 2026-10-17 : 26 exercices Kotlin, soit 52 compilations. 7 avaient déjà la clé d'un
template, toutes en mode `run` sur un exercice parti de sa base. Un artefact pèse en moyenne 250 Ko.

## Décision

- **`registry-tools build` précompile aussi l'état de départ de chaque exercice Kotlin**, en modes `test` et `run`,
  calculé par `exerciseStates` comme l'app le fait à l'ouverture, avec les globs de tests du template.
- **Une clé partagée par un template et un exercice n'est demandée qu'une fois.**
- **Un exercice dont la base n'est pas dans le registre est ignoré** : l'app le compile alors par le service.
- **Les solutions ne sont pas précompilées** : appliquer une solution modifie le projet.

## Conséquences

- Ouvrir un exercice et lancer ses tests ou son programme ne coûte plus aucun appel au service tant que rien n'est
  modifié, comme pour un template.
- 45 artefacts de plus, 12 Mo dans `artifacts/kotlin/`. L'app ne lit que la clé qu'elle demande : le poids
  téléchargé ne change pas.
- Un état de départ doit compiler. V9 l'exigeait déjà : un départ qui ne build pas fait échouer `template-check`.

## Alternatives écartées

- **Mode `test` seul** : environ 5 Mo de moins, mais lancer le programme d'un exercice repassait par le service, une
  exception de plus à expliquer.
- **Ne rien précompiler** : chaque ouverture d'exercice compile, alors que son état de départ est connu dès le build.
