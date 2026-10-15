# Add a daily revenue dashboard

Finance wants a dashboard of the money that came in and went out each day. A payment counts on the day it was made,
not the day the order was placed, and a refund counts on the day the paid order was cancelled. Orders that were never
paid do not appear.

Add `GET /revenue/daily`. Its body has one entry `days`: a list with one map per day with money in it, sorted by day,
such as `{day=2026-10-02, salesCents=4250, refundsCents=0}`.

The expected behaviour is in `src/test/kotlin/app/DailyRevenueTest.kt`. Start with
`src/main/kotlin/orders/OrdersHandler.kt`, where the customer history is computed today.

Done when all tests pass.
