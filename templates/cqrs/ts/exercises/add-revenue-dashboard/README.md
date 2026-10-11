# Add a daily revenue dashboard

Finance wants a dashboard of the money that came in and went out each day. A payment counts on the day it was made,
not the day the order was placed, and a refund counts on the day the paid order was cancelled. Orders that were never
paid do not appear.

Add `GET /revenue/daily`. It answers `{ days }`, one entry per day with money in it, sorted by day:
`{ day: '2026-10-02', salesCents, refundsCents }`.

The expected behaviour is in `tests/daily-revenue.test.ts`. Start with `src/orders/orders-handler.ts`, where the
customer history is computed today.

Done when all tests pass.
