+++
id = "overview"
title = "Discounts keep coming"
file = "src/main.ts"
+++

The shop has two discounts today: members get 10% off, and everyone gets 5.00 EUR off from 100.00 EUR. Click **Run**
to see them on the receipts of two sample orders.

Two is never the end of it. Marketing will ask for a Black Friday sale, then a welcome offer, then a discount on one
brand. Each request should be cheap, and none should risk breaking the discounts that already work.

The question this template answers is: **how can you add a discount without editing the code that computes prices?**

The open/closed principle says that code should be *open for extension* and *closed for modification*. Here, that means
one place where new discounts plug in, and pricing code that never has to change when they do. In the next steps you
will see the code before, the extension point, and the list of rules.
