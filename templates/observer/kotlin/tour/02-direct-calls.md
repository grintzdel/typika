+++
id = "direct-calls"
title = "The order calls everyone"
+++

Before the pattern, `placeOrder` did every reaction itself:

```kotlin
val orderId = orders.add(order)
val total = order.total

stock.reserve(order.lines)
notifier.notify(order.customer.email, "Order $orderId confirmed: $total")
analytics.track("order_placed", mapOf("orderId" to orderId, "totalCents" to total.cents))
```

This code is short and easy to follow. The cost shows up with the fourth reaction. Its service becomes a sixth
parameter of `placeOrder`, its call becomes a fourth line, and you edit the function that places orders to add
something that is not about placing orders. If a reaction only runs some of the time, the condition lands here too.

There is a quieter problem: if `stock.reserve` throws, the email and the analytics never run.

Open **Diff from base** to see the full before and after.
