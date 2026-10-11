# Accept returns

Customers may now return a delivered order within 14 days of its delivery. The shop refunds the card and the order
ends up `returned`, for good: nothing can happen to a returned order any more.

Add `POST /orders/:id/return`. It answers like the other actions, with the order's new status, or 409 when the order
cannot be returned: not delivered, delivered more than 14 days ago, or already returned.

The expected behaviour is in `tests/returns.test.ts`. Start with `src/orders/orders-handler.ts`.

Done when all tests pass.
