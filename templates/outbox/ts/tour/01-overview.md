+++
id = "overview"
title = "Saved, but never announced"
file = "src/main.ts"
+++

Click **Run**: every step of an order prints the message the shop publishes to the broker. Other services depend on
those messages: the warehouse ships on `OrderPaid`, the loyalty programme awards points on `OrderPlaced`.

In the base, each route writes the order, then publishes. Two systems, two writes, no transaction across them. If the
broker is down, the order is saved and the customer gets an error. If the process stops between the two writes, the
order exists and nobody else will ever hear of it.

The transactional outbox fixes this with the one transaction you do have: the database's. You will see the dual-write
problem, the outbox entry written with the order, the relay that publishes it, the consumer that copes with
duplicates, and what this costs.
