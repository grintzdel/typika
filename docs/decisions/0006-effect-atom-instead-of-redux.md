# 0006 — Effect Atom plutôt que Redux

**Statut** : Acceptée · 2026-10-08

## Contexte

La stack habituelle utilise Redux Toolkit, redux-persist et une outbox pour le local-first, avec des gateways HTTP
injectés via `extraArgument`. Dans Typika, l'état chaud est le contenu des fichiers et la sortie des process ; il n'y a
pas de mutation serveur.

## Décision

L'état UI est géré par **Effect Atom** (`@effect-atom/atom-react`), branché directement sur les services Effect fournis
par Layers côté client. Pas de Redux, pas de redux-persist, pas d'outbox ; les projets sont persistés par un adapter
IndexedDB derrière un port.

## Conséquences

- Un seul modèle (Effect) du runtime à l'UI ; cohérent avec effect-form déjà utilisé.
- Les mises à jour fréquentes (frappe, flux de sortie) ne passent pas par un store global sérialisé.
- Écart assumé avec les règles frontend habituelles ; les presenter hooks et composants purs sont conservés.

## Alternatives écartées

- **Redux Toolkit** : sérialisation et reducers inadaptés à des fichiers modifiés à chaque frappe ; outbox inutile.
- **Zustand / état local React** : n'apporte pas l'intégration avec les Streams et Scopes Effect.
