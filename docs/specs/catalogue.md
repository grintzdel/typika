# Spec — Initial catalogue

Status: draft · details §6.1 and §6.2 of the [design spec](./2026-10-08-typika-v1-design.md)

The initial catalogue covers **16 concepts**, available as about **44 templates** and their bases. For each concept,
this document sets what it teaches, its base, the outline of its tour and its exercises. The file format is defined in
[manifest.md](./manifest.md), how to write them in the
[author guide](../guides/template-authoring.md).

## 1. Common thread: a small online shop

All templates share the same domain: **a shop that takes orders, computes prices, takes payment, ships and
notifies**.

Why this domain:

- **Understood by everyone**: no time spent explaining the business, all the attention goes to the concept.
- **Rich enough for the 16 concepts**: pricing rules (OCP, Strategy), order lifecycle (state machine, event
  sourcing), external providers (Adapter, DIP, hexagonal), reactions to an event (Observer, outbox), reads that differ
  from writes (CQRS).
- **The templates echo each other**: the Adapter's `PaymentGateway` is the hexagonal port; the Observer's events are
  the ones the outbox makes reliable and event sourcing stores. A learner who moves from one template to another
  recognizes the code and sees only what changes.

### Common vocabulary

The following names MUST be used identically in all templates and all languages (case adapted to the language):

| Term | Meaning |
|---|---|
| `Order`, `OrderLine` | Order and its lines. |
| `OrderStatus` | `pending`, `paid`, `shipped`, `delivered`, `cancelled`. |
| `Customer` | Customer; `tier` ∈ `regular`, `member`. |
| `Product`, `Sku` | Product and its reference. |
| `Money` | Amount in integer cents + currency. Never a float. |
| `ShippingOption` | `standard`, `express`, `pickup-point`. |
| `PaymentGateway` | Payment port (`charge`, `refund`). |
| `Notifier` | Notification port (`notify`). |
| `OrderRepository` | Order persistence port. |
| `OrderPlaced`, `OrderPaid`, `OrderShipped`, `OrderCancelled` | Domain events. |

### Naming conventions of the official catalogue

| Element | Name | Example |
|---|---|---|
| Template | `<concept>-<lang>` | `strategy-ts`, `hexagonal-go` |
| Base of a principle / pattern / fundamental | `<concept>-base-<lang>` | `strategy-base-kotlin` |
| Base of the architectures (shared) | `naive-crud-<lang>` | `naive-crud-ts` |

`<lang>` ∈ `ts`, `js`, `go`, `kotlin`. `<concept>` is the last segment of the main topic: `strategy-ts`
(`design-pattern/behavioral/strategy`), `open-closed-ts` (`principle/open-closed`),
`composition-over-inheritance-go`. It is also the target of tour links (`typika:open-closed-ts`).

## 2. Coverage

| # | Concept | Main topic | Level | TS | JS | Go | Kotlin |
|---|---|---|---|---|---|---|---|
| 1 | Hexagonal | `architecture/hexagonal` | intermediate | ✓ | | ✓ | ✓ |
| 2 | CQRS | `architecture/cqrs` | advanced | ✓ | | ✓ | ✓ |
| 3 | Event sourcing | `architecture/event-sourcing` | advanced | ✓ | | | ✓ |
| 4 | Outbox | `architecture/outbox` | advanced | ✓ | | ✓ | ✓ |
| 5 | State machine | `architecture/state-machine` | intermediate | ✓ | | | ✓ |
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
| 16 | Composition over inheritance | `fundamental/composition-over-inheritance` | beginner | ✓ | ✓ | ✓ | ✓ |

Total: 16 TS + 16 Kotlin + 9 Go + 3 JS = **44 templates**. On top of these come the bases (`role = "base"`, hidden from
the hub): `naive-crud-<lang>` for the architectures, and one base per non-architectural concept and per language.

All templates: runtime `browser-js` (TS / JS), `go`, `kotlin`; no dependency outside the standard library and the test
tool; license `MIT-0`.

Each tour has 4 to 6 steps, starts with `overview` and ends with `trade-offs` ("when not to use it"). The `id`s listed
below are the canonical `id`s of the TS variant; the other variants align with them ([manifest.md §5.3](./manifest.md)).

---

## 3. Architecture

Common base: **`naive-crud-<lang>`**. An `orders` module where a single file validates the input, computes the total,
writes to in-memory storage, publishes an event to a fake broker and sends an email. The status is a series of
booleans (`isPaid`, `isShipped`, `isCancelled`). Reads (customer history) use the same model as writes. This single
base deliberately contains the five problems solved by the five architectures; each template restricts the diff view
to its files through `base.focus`.

### 3.1 Hexagonal — `architecture/hexagonal`

- **Problem**: the order logic is glued to the transport (simulated HTTP handler) and to storage; it cannot be tested
  or reused from another entry point.
- **Template**: pure `Order` domain; driven ports (`OrderRepository`, `PaymentGateway`, `Notifier`); driving port
  (`placeOrder` use case); in-memory and fake HTTP adapters; wiring in `main`.
- **Tour**: `overview` · `domain` · `ports` (driving and driven) · `adapters` · `wiring` · `trade-offs`.
- **Exercises**:
  - `refactor` `add-csv-import` (from base): accept orders from a CSV import. In the base, the handler logic has to be
    duplicated; here, it is a new driving adapter.
  - `fix` `add-email-adapter`: implement the missing `Notifier` adapter.
- **Variants**: Go — ports = implicit interfaces declared on the consumer side, `internal/` packages that make the
  boundary visible. Kotlin — `fun interface` for single-method ports, modules by package.
- **Links**: DIP (the same principle at application scale), Adapter (the driven adapters), CQRS.

### 3.2 CQRS — `architecture/cqrs`

- **Problem**: showing a customer's history (number of orders, total spent, last status) forces loading and
  recomputing the aggregates on every read, and bending the write model for reading.
- **Template**: commands (`PlaceOrder`, `CancelOrder`) on the write model; denormalized `CustomerOrderSummary` read
  model; projection updated synchronously after each command; queries that read only the read model.
- **Tour**: `overview` · `write-model` (commands and handlers) · `read-model` · `projection` · `consistency` ·
  `trade-offs`.
- **Exercises**:
  - `refactor` `add-revenue-dashboard` (from base): a "revenue per day" view. In the base, it changes the domain
    model; here, it is one more projection.
  - `fix` `project-cancellation`: the projection ignores `OrderCancelled`, the totals are wrong.
- **Variants**: Go — handlers as functions, read model as a `map`. Kotlin — `sealed interface Command`, exhaustive
  `when` on commands.
- **Links**: event sourcing (often combined, not required — the `consistency` tour step says so), outbox (asynchronous
  projection), hexagonal.

### 3.3 Event sourcing — `architecture/event-sourcing`

- **Problem**: the base overwrites the status; "why was this order cancelled, and when?" has no answer.
- **Template**: events (`OrderPlaced`, `OrderPaid`, `OrderShipped`, `OrderCancelled`); aggregate with `decide`
  (command → events) and `evolve` (state + event → state); in-memory event store, append-only, versioned;
  rehydration; one projection.
- **Tour**: `overview` · `events` · `decide-evolve` · `event-store` · `rehydration` · `trade-offs`.
- **Exercises**:
  - `refactor` `order-timeline` (from base): show the timeline of an order. Impossible in the base without a new
    table; here, it is a read of the events.
  - `fix` `optimistic-concurrency`: two concurrent writes on the same version must fail.
- **Variants**: Kotlin — `sealed interface OrderEvent` + `data class`, `fold` for rehydration. No Go in V1.
- **Links**: CQRS, state machine (`evolve` is a state machine), Observer.

### 3.4 Outbox — `architecture/outbox`

- **Problem**: the base saves the order then publishes `OrderPlaced`; if publishing fails or the process stops in
  between, the event is lost (dual write). The template's fake broker injects this failure.
- **Template**: in-memory storage with a simulated transaction; the order and the outbox entry are written in the
  same transaction; relay that publishes and marks the entry; idempotent consumer (at-least-once delivery).
- **Tour**: `overview` · `dual-write` · `same-transaction` · `relay` · `idempotent-consumer` · `trade-offs`.
- **Exercises**:
  - `refactor` `survive-broker-outage` (from base): no order may lose its event when the broker is unavailable.
  - `fix` `deduplicate-deliveries`: the consumer processes the same message twice.
- **Variants**: Go — relay in a goroutine with `context` for shutdown. Kotlin — synchronous relay
  driven by the test (no coroutines: `kotlinx.coroutines` is not in the stdlib).
- **Links**: Observer (the unreliable version), CQRS (asynchronous projection), event sourcing (the event store as an
  outbox).

### 3.5 State machine — `architecture/state-machine`

- **Problem**: with booleans, impossible states exist (`isShipped && isCancelled`) and the transition rules are
  scattered across `if`s.
- **Template**: explicit `OrderStatus`; transition table (state × event → state); invalid transition = typed error;
  impossible states can no longer be represented.
- **Tour**: `overview` · `impossible-states` · `states` · `transitions` · `guards` · `trade-offs`.
- **Exercises**:
  - `refactor` `add-returns` (from base): add the return of a delivered order, within 14 days.
  - `fix` `forbid-cancel-after-shipping`: the table allows a forbidden transition.
- **Variants**: TS — discriminated union. Kotlin — `sealed class` + exhaustive `when`, the compiler rejects a
  forgotten state. No Go in V1.
- **Links**: event sourcing, State (GoF, wave 2) — the difference is explicit in `trade-offs`: here the machine is
  data (a table), in State the behavior lives in each state object.

---

## 4. SOLID principles

Each principle has its own base `<concept>-base-<lang>`: the same code, which violates the principle. Base and template
share the same test suite (identical behavior), except for the tests added by the exercises.

### 4.1 SRP — `principle/single-responsibility`

- **Problem**: `OrderService` validates, computes prices, persists, formats the invoice and sends the email. Each
  change (new invoice format) risks breaking the rest.
- **Template**: responsibilities split by **reason to change** (`OrderValidator`, `PriceCalculator`,
  `InvoiceFormatter`, `OrderService` which orchestrates).
- **Tour**: `overview` · `reasons-to-change` · `split` · `orchestrator` · `trade-offs` (over-splitting).
- **Exercises**: `refactor` `add-pdf-invoice` (from base): a second invoice format.
- **Variants**: Kotlin — top-level functions when a class has no state.
- **Links**: DIP, hexagonal.

### 4.2 OCP — `principle/open-closed`

- **Problem**: discounts are a `switch` on `customer.tier` in the total computation; each new discount changes this
  computation.
- **Template**: list of discount rules (`DiscountRule`) applied by the calculator; adding a rule = adding a file.
- **Tour**: `overview` · `closed-switch` · `extension-point` · `rules` · `trade-offs` (do not open what does not
  vary).
- **Exercises**: `refactor` `add-black-friday-rule` (from base): a dated discount, stackable with the member discount.
- **Variants**: Kotlin — rules as `fun interface` or lambdas.
- **Links**: Strategy (OCP is the principle, Strategy one of its implementations), Decorator.

### 4.3 LSP — `principle/liskov-substitution`

- **Problem**: `DigitalProduct extends PhysicalProduct`; `weight()` returns 0 and `ship()` throws an exception. The
  shipping cost computation, written for `PhysicalProduct`, breaks or lies.
- **Template**: fixed hierarchy — common `Product`, a `Shippable` capability carried only by what ships; contract
  tests reused on each subtype.
- **Tour**: `overview` · `broken-promise` · `contract` · `contract-tests` · `trade-offs`.
- **Exercises**:
  - `refactor` `add-gift-card` (from base): a gift card, neither physical nor downloadable.
  - `fix` `contract-violation`: a provided subtype violates a contract test.
- **Variants**: Kotlin — classes `final` by default, explicit `open`: the language makes inheritance deliberate.
- **Links**: composition over inheritance, ISP.

### 4.4 ISP — `principle/interface-segregation`

- **Problem**: `PaymentGateway` imposes `charge`, `refund`, `saveCard`, `subscribe`. Gift card payment cannot refund
  and throws exceptions; its clients depend on methods they do not call.
- **Template**: narrow interfaces (`Chargeable`, `Refundable`, `CardVault`); each client depends only on what it
  uses.
- **Tour**: `overview` · `fat-interface` · `split-by-client` · `compose` · `trade-offs`.
- **Exercises**: `refactor` `add-gift-card-payment` (from base).
- **Variants**: Go — one- or two-method interfaces declared by the consumer: ISP is the default idiom, the tour shows
  it as such. Kotlin — one class implements several small interfaces.
- **Links**: Adapter, hexagonal.

### 4.5 DIP — `principle/dependency-inversion`

- **Problem**: `CheckoutService` instantiates `SmtpMailer` and `InMemoryOrderStore` in its constructor; it cannot be
  tested without them, nor can the provider be changed.
- **Template**: `CheckoutService` depends on abstractions (`Notifier`, `OrderRepository`) defined **next to it**;
  constructor injection; wiring in `main`.
- **Tour**: `overview` · `concrete-dependencies` · `own-the-abstraction` · `inject` · `composition-root` · `trade-offs`.
- **Exercises**: `refactor` `test-without-smtp` (from base): write a test that checks the notification without SMTP.
- **Variants**: Go — interface declared in the consumer package, `New…` that receives the dependencies. Kotlin —
  constructor injection, without a framework.
- **Links**: hexagonal ("DIP applied at the scale of an application"), Adapter.

---

## 5. Design patterns (GoF)

### 5.1 Strategy — `design-pattern/behavioral/strategy`

- **Problem**: the shipping cost is an `if / else` chain on `ShippingOption` in `ShippingQuote`.
- **Template**: `ShippingCost` interface; one implementation per option; `ShippingQuote` receives the strategy chosen
  by the customer at run time.
- **Tour**: `overview` · `the-problem` · `strategy-interface` · `context` · `choosing-at-runtime` · `trade-offs`.
- **Exercises**:
  - `refactor` `add-pickup-point-option` (from base).
  - `fix` `implement-express`: the express strategy is empty.
- **Variants**: Go — `type ShippingCost func(Order) Money`: the strategy is a function, the interface disappears.
  Kotlin — lambdas or `fun interface`. In each variant, the `strategy-interface` tour step explains why the code is
  shorter there.
- **Links**: OCP.

### 5.2 Observer — `design-pattern/behavioral/observer`

- **Problem**: `placeOrder` directly calls stock, email and analytics; adding a reaction changes the order code.
- **Template**: `OrderEvents` (subject); independent subscribers; `placeOrder` publishes `OrderPlaced` without knowing
  the subscribers; unsubscribing.
- **Tour**: `overview` · `direct-calls` · `subject` · `subscribers` · `failure-isolation` · `trade-offs` (ordering,
  errors, subscription leaks).
- **Exercises**:
  - `refactor` `add-loyalty-points` (from base).
  - `fix` `isolate-failing-subscriber`: a subscriber that throws an exception prevents the next ones from being
    notified.
- **Variants**: JS — native `EventTarget` / `CustomEvent`: the pattern is in the platform. Kotlin — list of
  `fun interface` listeners.
- **Links**: outbox (Observer does not guarantee delivery), event sourcing.

### 5.3 Decorator — `design-pattern/structural/decorator`

- **Problem**: `EmailNotifier` mixes sending, retry, logging and rate limiting; enabling retry without logging takes
  one more flag.
- **Template**: `Notifier`; minimal `EmailNotifier`; `RetryingNotifier`, `LoggingNotifier`, `ThrottledNotifier`
  that wrap a `Notifier`; composition in `main`.
- **Tour**: `overview` · `flag-soup` · `same-interface` · `wrapping` · `stacking-order` · `trade-offs`.
- **Exercises**:
  - `refactor` `add-sms-with-retry` (from base): an SMS notifier that benefits from retry without duplicating it.
  - `fix` `stacking-order`: the stacking order logs the attempts instead of the final send.
- **Variants**: JS — higher-order functions that wrap `notify`. Go — structs that embed the interface, in the style of
  `http.Handler` middleware. Kotlin — `by` delegation: the decorator rewrites only the method it changes.
- **Links**: OCP, Adapter (same shape, different intent — explained in `trade-offs`).

### 5.4 Factory Method — `design-pattern/creational/factory-method`

- **Problem**: `ship()` contains a `switch` on the carrier to build the parcel (`StandardParcel`, `ExpressParcel`);
  each new carrier changes `ship()`.
- **Template**: abstract `Carrier` with `ship(order)` (common algorithm) that calls the factory method
  `createParcel(order)`; one subclass per carrier.
- **Tour**: `overview` · `switch-on-type` · `creator` · `factory-method` · `concrete-creators` · `trade-offs`.
- **Exercises**: `refactor` `add-locker-carrier` (from base): a parcel locker carrier.
- **Variants**: Kotlin — `abstract class` + `override`, and a mention of the idiomatic alternative (factory passed as
  a lambda). No Go: without inheritance, the pattern reduces to constructor functions.
- **Links**: Strategy (variant by composition), composition over inheritance.

### 5.5 Adapter — `design-pattern/structural/adapter`

- **Problem**: the external payment SDK (`LegacyPayClient.makePayment(cents, currencyCode, cardToken)` which returns
  numeric codes) is called directly throughout the checkout.
- **Template**: `PaymentGateway.charge(Money, Card)` port that returns a typed result; `LegacyPayAdapter` translates
  calls, units and error codes; the simulated SDK is provided as is, not modifiable.
- **Tour**: `overview` · `foreign-interface` · `target-interface` · `translation` · `error-mapping` · `trade-offs`.
- **Exercises**:
  - `refactor` `switch-provider` (from base): plug in a second provider with a different contract.
  - `fix` `map-declined-code`: a decline code is translated into a success.
- **Variants**: Go — the adapter is a struct that satisfies the interface implicitly. Kotlin — extension functions
  as a lightweight alternative, and their limits.
- **Links**: hexagonal (driven adapters), ISP, Decorator.

---

## 6. OOP fundamentals

### 6.1 Composition over inheritance — `fundamental/composition-over-inheritance`

- **Level**: `beginner` — the only beginner template of V1, it validates the value of a "fundamentals" series.
- **Problem**: `Product → PhysicalProduct → PerishableProduct → DiscountedPerishableProduct`; adding "gift wrap"
  doubles the hierarchy.
- **Template**: `Product` composed of combinable policies (`PricingPolicy`, `ShippingPolicy`, `PackagingPolicy`).
- **Tour**: `overview` · `hierarchy` · `explosion` · `compose` · `delegate` · `trade-offs` (when inheritance remains
  the right choice).
- **Exercises**: `refactor` `add-gift-wrap` (from base).
- **Variants**:
  - JS — `class` as sugar over the prototype chain, then composition with objects and factory functions.
  - Go — no inheritance: embedding promotes methods but does not create a subtype; the tour shows the difference.
  - Kotlin — classes `final` by default, `by` delegation: the language pushes toward composition.
- **Links**: LSP, Decorator, Factory Method.

---

## 7. Link graph

```
DIP ──────────────► Hexagonal ◄────── Adapter
 │                    │   ▲              │
 ▼                    ▼   │              ▼
SRP                  CQRS ┘             ISP
                      │
OCP ◄── Strategy      ▼
 │                Event sourcing ◄── State machine
 ▼                    ▲
Decorator           Outbox ◄── Observer

Composition over inheritance ── LSP ── Factory Method
```

Each arrow is a `typika:<name>` link in at least one tour step (often `trade-offs`).

## 8. Catalogue roadmap

Step by step, with no date: a wave starts when the previous one is complete in TS and Kotlin.

### 8.1 Remaining GoF design patterns

Each wave mixes the three families.

| Wave | Creational | Structural | Behavioral | Idea in the common thread |
|---|---|---|---|---|
| 2 | Builder | Facade, Composite | Command, State | Build a complex order · checkout facade · bundle cart · undo / replay actions · order status as state objects |
| 3 | Abstract Factory | Proxy | Template Method, Chain of Responsibility, Iterator | Document family (invoice + delivery note) per country · catalogue cache · order import · validation chain · paginated traversal of orders |
| 4 | Prototype | Bridge | Visitor, Mediator, Memento | Order duplication · multi-format × multi-channel export · computations on a bundle tree · coordination of checkout widgets · restorable cart draft |
| 5 | Singleton (with its pitfalls) | Flyweight | Interpreter | Global configuration and why to avoid it · shared labels · mini-language for promo rules |

### 8.2 Beyond GoF — `design-pattern/other/*`

Repository, Unit of Work, Specification, Null Object, Result / Either, Dependency Injection. Several are already
present in the background (Repository in hexagonal, DI in DIP): their templates isolate them. Order decided after
wave 3.

### 8.3 Coverage of the next waves

- TS and Kotlin: always.
- Go: only when the pattern has an idiomatic form (Command, Chain of Responsibility, Iterator via `range` over
  func); otherwise absent rather than translated.
- JS: only when the platform brings something (Iterator with generators, Proxy with `Proxy`).

### 8.4 Other categories

- **Fundamentals** (encapsulation, polymorphism, abstract classes vs interfaces): decided after feedback on the
  first `beginner` template.
- **Principles** beyond SOLID (Law of Demeter, Tell Don't Ask, DRY vs coupling): after wave 3.
- **Architecture** (saga, combined CQRS + event sourcing, modular monolith): after GoF waves 2 and 3.
