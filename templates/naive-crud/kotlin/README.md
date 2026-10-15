# Naive CRUD: the orders module

The shared starting point of the Kotlin architecture templates. `OrdersHandler` answers simulated HTTP requests: it
reads the decoded JSON body, validates it, computes the total, saves the order, charges the card, publishes an event
to the broker and emails the customer, all in one class. The order status is a set of booleans (`isPaid`,
`isShipped`, `isDelivered`, `isCancelled`), and the customer history is computed from the same rows the handler
writes.

The code works and its tests pass. Each architecture template starts from it and fixes one of its problems:

- `hexagonal-kotlin`: the business rules cannot be reached without going through HTTP.
- `cqrs-kotlin`: the customer history is recomputed from the rows the handler writes, on every read.
- `event-sourcing-kotlin`: each step overwrites the order's status, so when and why it changed is lost.
- `outbox-kotlin`: the order is saved, then published; a broker failure between the two loses the event.
- `state-machine-kotlin`: the status is four booleans, and the rules about them are spread across every route.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places, pays, ships and cancels orders through the handler
gradle test
```
