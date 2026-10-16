+++
id = "guards"
title = "Guards: allowed by the table, decided at run time"
file = "src/main/kotlin/orders/OrdersHandler.kt"
region = "guards"
+++

The table says a pending order *may* become paid. Whether it does depends on something the table cannot know: the
card. That condition is a *guard*.

`payOrder` asks for the transition first, so a cancelled or already paid order is refused before the card is touched.
Then it charges the card, and only applies the new state if the charge was approved. A declined card leaves the order
pending, which is exactly what the table and the guard together describe.

Keep guards next to the transition they protect, and keep them about the outside world (a payment, a deadline, a
stock level). If a guard only looks at the current state, it belongs in the table instead.
