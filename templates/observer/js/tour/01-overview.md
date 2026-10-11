+++
id = "overview"
title = "One order, three reactions"
file = "src/main.js"
+++

When a customer places an order, three things happen: the shop reserves the stock, emails a confirmation and tracks
the sale. Click **Run** to see the three reactions for two sample orders.

Those reactions have nothing to do with each other, and the list keeps growing: loyalty points, an invoice, a message
to the warehouse. The question this template answers is: **how can placing an order trigger more and more reactions
without the order code knowing about any of them?**

The Observer pattern gives one answer. The order announces what happened, and every reaction that cares has
subscribed beforehand. In JavaScript you do not have to write that machinery: `EventTarget`, the object behind every
DOM event, is available in browsers, workers and Node.

In the next steps you will see the code before the pattern, the subject, the subscribers, and what the platform does
when one of them fails.
