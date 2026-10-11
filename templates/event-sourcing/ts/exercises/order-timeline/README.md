# Show the timeline of an order

Support keeps getting the same question: "why was my order cancelled, and when?" The shop knows the current status of
an order, and nothing else.

Add `GET /orders/:id/timeline`. It answers `{ timeline }`: what happened to the order, in order, with the time it
happened (`{ event: 'OrderPaid', at: '2026-10-02T09:00:00.000Z' }`) and, for a cancellation, the reason the customer
gave. Actions the shop refused do not appear.

The expected behaviour is in `tests/order-timeline.test.ts`. Start with `src/orders/orders-handler.ts`.

Done when all tests pass.
