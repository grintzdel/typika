# Hexagonal architecture: the orders module

The shop's orders can be placed, paid, shipped, delivered and cancelled, and each step saves the order, charges or
refunds the card, publishes an event and emails the customer. This template shows the hexagonal architecture, also
called ports and adapters: the business rules live in a core that declares the ports it offers and needs, and HTTP,
storage, payments, email and the broker plug into it as adapters.

Compare it with its base, `naive-crud-kotlin`, where one HTTP handler does all of it.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places, pays, ships and cancels orders through the HTTP adapter
gradle test
```

## What to look at

- `src/main/kotlin/orders/domain/`: the order, its rules and its sealed exceptions, with no dependency outside.
- `src/main/kotlin/orders/Ports.kt`: the driving port (`OrderUseCases`) and the driven ports the core needs.
- `src/main/kotlin/orders/OrderService.kt`: the use cases, written against ports only.
- `src/main/kotlin/orders/adapters/`: HTTP in front, storage, payments, email and the broker behind.
- `src/main/kotlin/app/OpenShop.kt`: the one place that wires adapters to ports.

## Variants

- TypeScript: `hexagonal-ts`, with the same ports as interfaces.
- Go: `hexagonal-go`, where ports are implicit interfaces declared by their consumer.
