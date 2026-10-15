# Hexagonal architecture: the orders module

The shop's orders can be placed, paid, shipped, delivered and cancelled, and each step saves the order, charges or
refunds the card, publishes an event and emails the customer. This template shows the hexagonal architecture, also
called ports and adapters: the business rules live in a core that declares the ports it offers and needs, and HTTP,
storage, payments, email and the broker plug into it as adapters.

Compare it with its base, `naive-crud-ts`, where one HTTP handler does all of it.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places, pays, ships and cancels orders through the HTTP adapter
npm test
```

## What to look at

- `src/orders/domain/order.ts`: the order and its rules, with no dependency on anything outside.
- `src/orders/ports.ts`: the driving port (`OrderUseCases`) and the driven ports the core needs.
- `src/orders/order-service.ts`: the use cases, written against ports only.
- `src/orders/adapters/`: HTTP in front, storage, payments, email and the broker behind.
- `src/open-shop.ts`: the one place that wires adapters to ports.

## Variants

- Go: `hexagonal-go`, where ports are implicit interfaces declared by their consumer.
- Kotlin: `hexagonal-kotlin`, with `fun interface` ports and a sealed hierarchy of domain exceptions.
