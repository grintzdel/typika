# Naive CRUD: the orders module

The shared starting point of the architecture templates. `OrdersHandler` answers simulated HTTP requests: it validates
the input, computes the total, saves the order, charges the card, publishes an event to the broker and emails the
customer, all in one class. The order status is a set of booleans (`isPaid`, `isShipped`, `isDelivered`,
`isCancelled`), and the customer history is computed from the same rows the handler writes.

The code works and its tests pass. Each architecture template starts from it and fixes one of its problems:

- `hexagonal-ts`: the business rules cannot be reached without going through HTTP.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places, pays, ships and cancels orders through the handler
npm test
```
