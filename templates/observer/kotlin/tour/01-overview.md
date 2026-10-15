+++
id = "overview"
title = "One order, three reactions"
file = "src/main/kotlin/Main.kt"
+++

When a customer places an order, three things happen: the shop reserves the stock, emails a confirmation and tracks
the sale. Click **Run** to see the three reactions for two sample orders.

Those reactions have nothing to do with each other, and the list keeps growing: loyalty points, an invoice, a message
to the warehouse. The question this template answers is: **how can placing an order trigger more and more reactions
without the order code knowing about any of them?**

The Observer pattern gives one answer. The order announces what happened, and every reaction that cares has
subscribed beforehand.

In the next steps you will see the code before the pattern, the subject that carries the announcement, the
subscribers, and what happens when one of them fails.
