+++
id = "direct-calls"
title = "The order calls everyone"
+++

Before the pattern, `placeOrder` did every reaction itself:

```ts
const orderId = orders.add(order)
const total = totalOf(order)

stock.reserve(order.lines)
notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(total)}`)
analytics.track('order_placed', { orderId, totalCents: total.cents })
```

This code is short and easy to follow. The cost shows up with the fourth reaction. Its service becomes a fifth
parameter of `placeOrder`, its call becomes a fourth line, and you edit the function that places orders to add
something that is not about placing orders. If a reaction only runs some of the time, the condition lands here too.

There is a quieter problem: if `stock.reserve` throws, the email and the analytics never run.

Open **Diff from base** to see the full before and after.
