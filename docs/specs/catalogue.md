# Spec — Catalogue initial

Statut : brouillon · détaille les §6.1 et §6.2 de la [spec de conception](./2026-10-08-typika-v1-design.md)

Le catalogue initial couvre **16 concepts**, déclinés en environ **44 templates** et leurs bases. Ce document fixe, pour
chaque concept, ce qu'il enseigne, sa base, le plan de son tour et ses exercices. Le format des fichiers est défini dans
[manifest.md](./manifest.md), la manière de les écrire dans le
[guide d'auteur](../guides/template-authoring.md).

## 1. Fil rouge : une petite boutique en ligne

Tous les templates partagent le même domaine : **une boutique qui prend des commandes, calcule des prix, encaisse,
expédie et notifie**.

Pourquoi ce domaine :

- **Compris de tous** : pas de temps passé à expliquer le métier, toute l'attention va au concept.
- **Assez riche pour les 16 concepts** : règles de prix (OCP, Strategy), cycle de vie d'une commande (machine à états,
  event sourcing), prestataires externes (Adapter, DIP, hexagonal), réactions à un événement (Observer, outbox),
  lectures différentes des écritures (CQRS).
- **Les templates se répondent** : le `PaymentGateway` de l'Adapter est le port de l'hexagonal ; les événements de
  l'Observer sont ceux que l'outbox fiabilise et que l'event sourcing stocke. Un apprenant qui passe d'un template à
  l'autre reconnaît le code et ne voit que ce qui change.

### Vocabulaire commun

Les noms suivants DOIVENT être utilisés à l'identique dans tous les templates et toutes les langues (casse adaptée au
langage) :

| Terme | Sens |
|---|---|
| `Order`, `OrderLine` | Commande et ses lignes. |
| `OrderStatus` | `pending`, `paid`, `shipped`, `delivered`, `cancelled`. |
| `Customer` | Client ; `tier` ∈ `regular`, `member`. |
| `Product`, `Sku` | Produit et sa référence. |
| `Money` | Montant en centimes entiers + devise. Jamais de flottant. |
| `ShippingOption` | `standard`, `express`, `pickup-point`. |
| `PaymentGateway` | Port d'encaissement (`charge`, `refund`). |
| `Notifier` | Port de notification (`notify`). |
| `OrderRepository` | Port de persistance des commandes. |
| `OrderPlaced`, `OrderPaid`, `OrderShipped`, `OrderCancelled` | Événements du domaine. |

### Conventions de nommage du catalogue officiel

| Élément | Nom | Exemple |
|---|---|---|
| Template | `<concept>-<lang>` | `strategy-ts`, `hexagonal-go` |
| Base d'un principe / pattern / fondamental | `<concept>-base-<lang>` | `strategy-base-kotlin` |
| Base des architectures (partagée) | `naive-crud-<lang>` | `naive-crud-ts` |

`<lang>` ∈ `ts`, `js`, `go`, `kotlin`. `<concept>` est le dernier segment du topic principal : `strategy-ts`
(`design-pattern/behavioral/strategy`), `open-closed-ts` (`principle/open-closed`),
`composition-over-inheritance-go`. C'est aussi la cible des liens de tour (`typika:open-closed-ts`).

## 2. Couverture

| # | Concept | Topic principal | Niveau | TS | JS | Go | Kotlin |
|---|---|---|---|---|---|---|---|
| 1 | Hexagonal | `architecture/hexagonal` | intermediate | ✓ | | ✓ | ✓ |
| 2 | CQRS | `architecture/cqrs` | advanced | ✓ | | ✓ | ✓ |
| 3 | Event sourcing | `architecture/event-sourcing` | advanced | ✓ | | | ✓ |
| 4 | Outbox | `architecture/outbox` | advanced | ✓ | | ✓ | ✓ |
| 5 | Machine à états | `architecture/state-machine` | intermediate | ✓ | | | ✓ |
| 6 | SRP | `principle/single-responsibility` | intermediate | ✓ | | | ✓ |
| 7 | OCP | `principle/open-closed` | intermediate | ✓ | | | ✓ |
| 8 | LSP | `principle/liskov-substitution` | intermediate | ✓ | | | ✓ |
| 9 | ISP | `principle/interface-segregation` | intermediate | ✓ | | ✓ | ✓ |
| 10 | DIP | `principle/dependency-inversion` | intermediate | ✓ | | ✓ | ✓ |
| 11 | Strategy | `design-pattern/behavioral/strategy` | intermediate | ✓ | | ✓ | ✓ |
| 12 | Observer | `design-pattern/behavioral/observer` | intermediate | ✓ | ✓ | | ✓ |
| 13 | Decorator | `design-pattern/structural/decorator` | intermediate | ✓ | ✓ | ✓ | ✓ |
| 14 | Factory Method | `design-pattern/creational/factory-method` | intermediate | ✓ | | | ✓ |
| 15 | Adapter | `design-pattern/structural/adapter` | intermediate | ✓ | | ✓ | ✓ |
| 16 | Composition vs héritage | `fundamental/composition-over-inheritance` | beginner | ✓ | ✓ | ✓ | ✓ |

Total : 16 TS + 16 Kotlin + 9 Go + 3 JS = **44 templates**. S'y ajoutent les bases (`role = "base"`, masquées du
hub) : `naive-crud-<lang>` pour les architectures, et une base par concept non architectural et par langage.

Tous les templates : runtime `browser-js` (TS / JS), `go`, `kotlin` ; aucune dépendance hors bibliothèque standard et
outil de test ; licence `MIT-0`.

Chaque tour compte 4 à 6 étapes, commence par `overview` et finit par `trade-offs` (« quand ne pas l'utiliser »). Les `id` listés ci-dessous
sont les `id` canoniques de la variante TS ; les autres variantes s'y alignent ([manifest.md §5.3](./manifest.md)).

---

## 3. Architecture

Base commune : **`naive-crud-<lang>`**. Un module `orders` où un même fichier valide l'entrée, calcule le total, écrit
dans un stockage en mémoire, publie un événement à un faux broker et envoie un e-mail. Le statut est une série de
booléens (`isPaid`, `isShipped`, `isCancelled`). Les lectures (historique client) utilisent le même modèle que les
écritures. Cette base unique contient volontairement les cinq problèmes résolus par les cinq architectures ; chaque
template restreint la vue diff à ses fichiers via `base.focus`.

### 3.1 Hexagonal — `architecture/hexagonal`

- **Problème** : la logique de commande est collée au transport (handler HTTP simulé) et au stockage ; impossible de la
  tester ou de la réutiliser depuis une autre entrée.
- **Template** : domaine `Order` pur ; ports pilotés (`OrderRepository`, `PaymentGateway`, `Notifier`) ; port pilote
  (cas d'usage `placeOrder`) ; adapters en mémoire et faux HTTP ; assemblage dans `main`.
- **Tour** : `overview` · `domain` · `ports` (pilotes et pilotés) · `adapters` · `wiring` · `trade-offs`.
- **Exercices** :
  - `refactor` `add-csv-import` (from base) : accepter des commandes depuis un import CSV. Dans la base, il faut dupliquer
    la logique du handler ; ici, c'est un nouvel adapter pilote.
  - `fix` `add-email-adapter` : implémenter l'adapter `Notifier` manquant.
- **Variantes** : Go — ports = interfaces implicites déclarées côté consommateur, packages `internal/` qui rendent la
  frontière visible. Kotlin — `fun interface` pour les ports à une méthode, modules par package.
- **Liens** : DIP (le même principe à l'échelle de l'application), Adapter (les adapters pilotés), CQRS.

### 3.2 CQRS — `architecture/cqrs`

- **Problème** : afficher l'historique d'un client (nombre de commandes, total dépensé, dernier statut) oblige à charger
  et recalculer les agrégats à chaque lecture, et à tordre le modèle d'écriture pour la lecture.
- **Template** : commandes (`PlaceOrder`, `CancelOrder`) sur le modèle d'écriture ; read model `CustomerOrderSummary`
  dénormalisé ; projection mise à jour de façon synchrone après chaque commande ; queries qui ne lisent que le read model.
- **Tour** : `overview` · `write-model` (commandes et handlers) · `read-model` · `projection` · `consistency` ·
  `trade-offs`.
- **Exercices** :
  - `refactor` `add-revenue-dashboard` (from base) : une vue « chiffre d'affaires par jour ». Dans la base, elle modifie
    le modèle de domaine ; ici, c'est une projection de plus.
  - `fix` `project-cancellation` : la projection ignore `OrderCancelled`, les totaux sont faux.
- **Variantes** : Go — handlers comme fonctions, read model en `map`. Kotlin — `sealed interface Command`, `when`
  exhaustif sur les commandes.
- **Liens** : event sourcing (souvent combiné, pas obligatoire — le tour `consistency` le dit), outbox (projection
  asynchrone), hexagonal.

### 3.3 Event sourcing — `architecture/event-sourcing`

- **Problème** : la base écrase le statut ; « pourquoi cette commande a-t-elle été annulée, et quand ? » n'a pas de
  réponse.
- **Template** : événements (`OrderPlaced`, `OrderPaid`, `OrderShipped`, `OrderCancelled`) ; agrégat avec `decide`
  (commande → événements) et `evolve` (état + événement → état) ; event store en mémoire, append-only, versionné ;
  réhydratation ; une projection.
- **Tour** : `overview` · `events` · `decide-evolve` · `event-store` · `rehydration` · `trade-offs`.
- **Exercices** :
  - `refactor` `order-timeline` (from base) : afficher la chronologie d'une commande. Impossible dans la base sans
    nouvelle table ; ici, c'est une lecture des événements.
  - `fix` `optimistic-concurrency` : deux écritures concurrentes sur la même version doivent échouer.
- **Variantes** : Kotlin — `sealed interface OrderEvent` + `data class`, `fold` pour la réhydratation. Pas de Go en V1.
- **Liens** : CQRS, machine à états (`evolve` est une machine à états), Observer.

### 3.4 Outbox — `architecture/outbox`

- **Problème** : la base enregistre la commande puis publie `OrderPlaced` ; si la publication échoue ou si le process
  s'arrête entre les deux, l'événement est perdu (double écriture). Le faux broker du template injecte cette panne.
- **Template** : stockage en mémoire avec transaction simulée ; écriture de la commande et de l'entrée d'outbox dans la
  même transaction ; relais qui publie et marque l'entrée ; consommateur idempotent (livraison au moins une fois).
- **Tour** : `overview` · `dual-write` · `same-transaction` · `relay` · `idempotent-consumer` · `trade-offs`.
- **Exercices** :
  - `refactor` `survive-broker-outage` (from base) : aucune commande ne doit perdre son événement quand le broker est
    indisponible.
  - `fix` `deduplicate-deliveries` : le consommateur traite deux fois le même message.
- **Variantes** : Go — relais en goroutine avec `context` pour l'arrêt (sous réserve du spike R7). Kotlin — relais
  synchrone piloté par le test (pas de coroutines tant que R8 n'a pas validé leur support en cible JS / Wasm).
- **Liens** : Observer (la version non fiable), CQRS (projection asynchrone), event sourcing (l'event store comme
  outbox).

### 3.5 Machine à états — `architecture/state-machine`

- **Problème** : avec des booléens, des états impossibles existent (`isShipped && isCancelled`) et les règles de
  transition sont dispersées dans des `if`.
- **Template** : `OrderStatus` explicite ; table de transitions (état × événement → état) ; transition invalide =
  erreur typée ; les états impossibles ne sont plus représentables.
- **Tour** : `overview` · `impossible-states` · `states` · `transitions` · `guards` · `trade-offs`.
- **Exercices** :
  - `refactor` `add-returns` (from base) : ajouter le retour d'une commande livrée, sous 14 jours.
  - `fix` `forbid-cancel-after-shipping` : la table autorise une transition interdite.
- **Variantes** : TS — union discriminée. Kotlin — `sealed class` + `when` exhaustif, le compilateur refuse un état
  oublié. Pas de Go en V1.
- **Liens** : event sourcing, State (GoF, vague 2) — la différence est explicite dans `trade-offs` : ici la machine est
  une donnée (table), dans State le comportement vit dans chaque objet état.

---

## 4. Principes SOLID

Chaque principe a sa propre base `<concept>-base-<lang>` : le même code, qui viole le principe. Base et template
partagent la même suite de tests (comportement identique), à l'exception des tests ajoutés par les exercices.

### 4.1 SRP — `principle/single-responsibility`

- **Problème** : `OrderService` valide, calcule les prix, persiste, formate la facture et envoie l'e-mail. Chaque
  changement (nouveau format de facture) risque de casser le reste.
- **Template** : responsabilités séparées par **raison de changer** (`OrderValidator`, `PriceCalculator`,
  `InvoiceFormatter`, `OrderService` qui orchestre).
- **Tour** : `overview` · `reasons-to-change` · `split` · `orchestrator` · `trade-offs` (le sur-découpage).
- **Exercices** : `refactor` `add-pdf-invoice` (from base) : un second format de facture.
- **Variantes** : Kotlin — fonctions de premier niveau quand une classe n'a pas d'état.
- **Liens** : DIP, hexagonal.

### 4.2 OCP — `principle/open-closed`

- **Problème** : les remises sont un `switch` sur `customer.tier` dans le calcul du total ; chaque nouvelle remise
  modifie ce calcul.
- **Template** : liste de règles de remise (`DiscountRule`) appliquées par le calculateur ; ajouter une règle = ajouter
  un fichier.
- **Tour** : `overview` · `closed-switch` · `extension-point` · `rules` · `trade-offs` (ne pas ouvrir ce qui ne varie
  pas).
- **Exercices** : `refactor` `add-black-friday-rule` (from base) : une remise datée, cumulable avec la remise membre.
- **Variantes** : Kotlin — règles en `fun interface` ou lambdas.
- **Liens** : Strategy (OCP est le principe, Strategy une de ses mises en œuvre), Decorator.

### 4.3 LSP — `principle/liskov-substitution`

- **Problème** : `DigitalProduct extends PhysicalProduct` ; `weight()` renvoie 0 et `ship()` lève une exception. Le
  calcul de frais de port, écrit pour `PhysicalProduct`, casse ou ment.
- **Template** : hiérarchie corrigée — `Product` commun, capacité `Shippable` portée seulement par ce qui s'expédie ;
  tests de contrat réutilisés sur chaque sous-type.
- **Tour** : `overview` · `broken-promise` · `contract` · `contract-tests` · `trade-offs`.
- **Exercices** :
  - `refactor` `add-gift-card` (from base) : une carte cadeau, ni physique ni téléchargeable.
  - `fix` `contract-violation` : un sous-type fourni viole un test de contrat.
- **Variantes** : Kotlin — classes `final` par défaut, `open` explicite : le langage rend l'héritage délibéré.
- **Liens** : composition vs héritage, ISP.

### 4.4 ISP — `principle/interface-segregation`

- **Problème** : `PaymentGateway` impose `charge`, `refund`, `saveCard`, `subscribe`. Le paiement par carte cadeau ne
  sait pas rembourser et lève des exceptions ; ses clients dépendent de méthodes qu'ils n'appellent pas.
- **Template** : interfaces étroites (`Chargeable`, `Refundable`, `CardVault`) ; chaque client ne dépend que de ce qu'il
  utilise.
- **Tour** : `overview` · `fat-interface` · `split-by-client` · `compose` · `trade-offs`.
- **Exercices** : `refactor` `add-gift-card-payment` (from base).
- **Variantes** : Go — interfaces d'une ou deux méthodes déclarées par le consommateur : ISP est l'idiome par défaut,
  le tour le montre comme tel. Kotlin — une classe implémente plusieurs petites interfaces.
- **Liens** : Adapter, hexagonal.

### 4.5 DIP — `principle/dependency-inversion`

- **Problème** : `CheckoutService` instancie `SmtpMailer` et `InMemoryOrderStore` dans son constructeur ; impossible de
  le tester sans eux ni de changer de prestataire.
- **Template** : `CheckoutService` dépend d'abstractions (`Notifier`, `OrderRepository`) définies **à côté de lui** ;
  injection par le constructeur ; assemblage dans `main`.
- **Tour** : `overview` · `concrete-dependencies` · `own-the-abstraction` · `inject` · `composition-root` · `trade-offs`.
- **Exercices** : `refactor` `test-without-smtp` (from base) : écrire un test qui vérifie la notification sans SMTP.
- **Variantes** : Go — interface déclarée dans le package consommateur, `New…` qui reçoit les dépendances. Kotlin —
  injection par constructeur, sans framework.
- **Liens** : hexagonal (« le DIP appliqué à l'échelle d'une application »), Adapter.

---

## 5. Design patterns (GoF)

### 5.1 Strategy — `design-pattern/behavioral/strategy`

- **Problème** : le coût de livraison est une chaîne `if / else` sur `ShippingOption` dans `ShippingQuote`.
- **Template** : interface `ShippingCost` ; une implémentation par option ; `ShippingQuote` reçoit la stratégie choisie
  par le client à l'exécution.
- **Tour** : `overview` · `the-problem` · `strategy-interface` · `context` · `choosing-at-runtime` · `trade-offs`.
- **Exercices** :
  - `refactor` `add-pickup-point-option` (from base).
  - `fix` `implement-express` : la stratégie express est vide.
- **Variantes** : Go — `type ShippingCost func(Order) Money` : la stratégie est une fonction, l'interface disparaît.
  Kotlin — lambdas ou `fun interface`. Le tour `strategy-interface` explique dans chaque variante pourquoi le code y est
  plus court.
- **Liens** : OCP.

### 5.2 Observer — `design-pattern/behavioral/observer`

- **Problème** : `placeOrder` appelle directement le stock, l'e-mail et l'analytics ; ajouter une réaction modifie la
  commande.
- **Template** : `OrderEvents` (sujet) ; abonnés indépendants ; `placeOrder` publie `OrderPlaced` sans connaître les
  abonnés ; désabonnement.
- **Tour** : `overview` · `direct-calls` · `subject` · `subscribers` · `failure-isolation` · `trade-offs` (ordre,
  erreurs, fuites d'abonnements).
- **Exercices** :
  - `refactor` `add-loyalty-points` (from base).
  - `fix` `isolate-failing-subscriber` : un abonné qui lève une exception empêche les suivants d'être notifiés.
- **Variantes** : JS — `EventTarget` / `CustomEvent` natifs : le pattern est dans la plateforme. Kotlin — liste de
  `fun interface` listeners.
- **Liens** : outbox (Observer ne garantit pas la livraison), event sourcing.

### 5.3 Decorator — `design-pattern/structural/decorator`

- **Problème** : `EmailNotifier` mêle envoi, retry, log et limitation de débit ; activer le retry sans le log demande un
  drapeau de plus.
- **Template** : `Notifier` ; `EmailNotifier` minimal ; `RetryingNotifier`, `LoggingNotifier`, `ThrottledNotifier`
  qui enveloppent un `Notifier` ; composition dans `main`.
- **Tour** : `overview` · `flag-soup` · `same-interface` · `wrapping` · `stacking-order` · `trade-offs`.
- **Exercices** :
  - `refactor` `add-sms-with-retry` (from base) : un notifier SMS qui bénéficie du retry sans le dupliquer.
  - `fix` `stacking-order` : l'ordre d'empilement fait logguer les tentatives au lieu de l'envoi final.
- **Variantes** : JS — fonctions d'ordre supérieur qui enveloppent `notify`. Go — structs qui embarquent l'interface,
  façon middleware `http.Handler`. Kotlin — délégation `by` : le décorateur ne réécrit que la méthode qu'il change.
- **Liens** : OCP, Adapter (même forme, intention différente — expliqué dans `trade-offs`).

### 5.4 Factory Method — `design-pattern/creational/factory-method`

- **Problème** : `ship()` contient un `switch` sur le transporteur pour construire le colis (`StandardParcel`,
  `ExpressParcel`) ; chaque nouveau transporteur modifie `ship()`.
- **Template** : `Carrier` abstrait avec `ship(order)` (algorithme commun) qui appelle la méthode de fabrique
  `createParcel(order)` ; une sous-classe par transporteur.
- **Tour** : `overview` · `switch-on-type` · `creator` · `factory-method` · `concrete-creators` · `trade-offs`.
- **Exercices** : `refactor` `add-locker-carrier` (from base) : un transporteur consigne automatique.
- **Variantes** : Kotlin — `abstract class` + `override`, et mention de l'alternative idiomatique (fabrique passée en
  lambda). Pas de Go : sans héritage, le pattern se réduit à des fonctions constructeurs.
- **Liens** : Strategy (variante par composition), composition vs héritage.

### 5.5 Adapter — `design-pattern/structural/adapter`

- **Problème** : le SDK de paiement externe (`LegacyPayClient.makePayment(cents, currencyCode, cardToken)` qui renvoie
  des codes numériques) est appelé directement dans tout le checkout.
- **Template** : port `PaymentGateway.charge(Money, Card)` qui renvoie un résultat typé ; `LegacyPayAdapter` traduit
  appels, unités et codes d'erreur ; le SDK simulé est fourni tel quel, non modifiable.
- **Tour** : `overview` · `foreign-interface` · `target-interface` · `translation` · `error-mapping` · `trade-offs`.
- **Exercices** :
  - `refactor` `switch-provider` (from base) : brancher un second prestataire au contrat différent.
  - `fix` `map-declined-code` : un code de refus est traduit en succès.
- **Variantes** : Go — l'adapter est un struct qui satisfait l'interface implicitement. Kotlin — extension functions
  comme alternative légère, et leurs limites.
- **Liens** : hexagonal (adapters pilotés), ISP, Decorator.

---

## 6. Fondamentaux POO

### 6.1 Composition vs héritage — `fundamental/composition-over-inheritance`

- **Niveau** : `beginner` — seul template débutant de la V1, il valide l'intérêt d'une série « fondamentaux ».
- **Problème** : `Product → PhysicalProduct → PerishableProduct → DiscountedPerishableProduct` ; ajouter « emballage
  cadeau » double la hiérarchie.
- **Template** : `Product` composé de politiques (`PricingPolicy`, `ShippingPolicy`, `PackagingPolicy`) combinables.
- **Tour** : `overview` · `hierarchy` · `explosion` · `compose` · `delegate` · `trade-offs` (quand l'héritage reste le
  bon choix).
- **Exercices** : `refactor` `add-gift-wrap` (from base).
- **Variantes** :
  - JS — `class` comme sucre sur la chaîne de prototypes, puis composition par objets et fonctions fabriques.
  - Go — pas d'héritage : l'embedding promeut des méthodes mais ne crée pas de sous-type ; le tour montre la différence.
  - Kotlin — classes `final` par défaut, délégation `by` : le langage pousse vers la composition.
- **Liens** : LSP, Decorator, Factory Method.

---

## 7. Graphe des liens

```
DIP ──────────────► Hexagonal ◄────── Adapter
 │                    │   ▲              │
 ▼                    ▼   │              ▼
SRP                  CQRS ┘             ISP
                      │
OCP ◄── Strategy      ▼
 │                Event sourcing ◄── Machine à états
 ▼                    ▲
Decorator           Outbox ◄── Observer

Composition vs héritage ── LSP ── Factory Method
```

Chaque flèche est un lien `typika:<name>` dans au moins une étape de tour (souvent `trade-offs`).

## 8. Feuille de route du catalogue

Pas à pas, sans date : une vague démarre quand la précédente est complète en TS et Kotlin.

### 8.1 Design patterns GoF restants

Chaque vague mélange les trois familles.

| Vague | Création | Structure | Comportement | Idée dans le fil rouge |
|---|---|---|---|---|
| 2 | Builder | Facade, Composite | Command, State | Construire une commande complexe · façade de checkout · panier de lots · annulation / rejouer des actions · statut de commande en objets état |
| 3 | Abstract Factory | Proxy | Template Method, Chain of Responsibility, Iterator | Famille de documents (facture + bon de livraison) par pays · cache du catalogue · import de commandes · chaîne de validation · parcours paginé des commandes |
| 4 | Prototype | Bridge | Visitor, Mediator, Memento | Duplication d'une commande · export multi-formats × multi-canaux · calculs sur un arbre de lots · coordination des widgets du checkout · brouillon de panier restaurable |
| 5 | Singleton (avec ses pièges) | Flyweight | Interpreter | Configuration globale et pourquoi l'éviter · étiquettes partagées · mini-langage de règles promo |

### 8.2 Hors GoF — `design-pattern/other/*`

Repository, Unit of Work, Specification, Null Object, Result / Either, Dependency Injection. Plusieurs sont déjà
présents en filigrane (Repository dans l'hexagonal, DI dans le DIP) : leurs templates les isolent. Ordre décidé après la
vague 3.

### 8.3 Couverture des vagues suivantes

- TS et Kotlin : systématiques.
- Go : seulement quand le pattern a une forme idiomatique (Command, Chain of Responsibility, Iterator via `range` sur
  func — sous réserve du spike R7) ; sinon absent plutôt que traduit.
- JS : seulement quand la plateforme apporte quelque chose (Iterator avec les générateurs, Proxy avec `Proxy`).

### 8.4 Autres catégories

- **Fondamentaux** (encapsulation, polymorphisme, classes abstraites vs interfaces) : décidés après retours sur le
  premier template `beginner`.
- **Principes** hors SOLID (loi de Déméter, Tell Don't Ask, DRY vs couplage) : après la vague 3.
- **Architecture** (saga, CQRS + event sourcing combinés, modular monolith) : après les vagues GoF 2 et 3.
