+++
id = "overview"
title = "Four jobs, one interface"
file = "src/main/kotlin/Main.kt"
+++

Payments do more than take money. The shop charges a card or requests a bank transfer, refunds a payment, saves a card
for next time and bills the tea club every month. Click **Run** to see each of them in the ledger.

Not every payment method can do all four. A bank transfer can be refunded, but there is no card to save and nothing to
bill monthly. A gift card, coming soon, can only be charged.

The question this template answers is: **what should an interface contain when its implementations can do different
things?** The interface segregation principle answers from the other side: no client should depend on methods it does
not call. Shape interfaces around what each client needs, and implementations follow.

In the next steps you will see one interface that forces every method on every payment method, the split by client,
and how one class plays several roles.
