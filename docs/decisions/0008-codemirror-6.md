# 0008 — CodeMirror 6 comme éditeur

**Statut** : Remplacée par [0015](0015-editor.md) · 2026-10-08

## Contexte

L'éditeur doit fonctionner dans la sandbox et dans l'embed, y compris sur mobile en lecture, avec un bon support de
TypeScript.

## Décision

**CodeMirror 6**, avec un language service TypeScript dans un worker.

## Conséquences

- Léger, modulaire, adapté à l'embed et au mobile.
- L'IntelliSense TS demande un assemblage (R4).
- Surlignage des lignes du tour et vue diff à construire sur ses extensions.

## Alternatives écartées

- **Monaco** : meilleur IntelliSense TS d'emblée, mais lourd et médiocre sur mobile. Retenu si R4 échoue.
