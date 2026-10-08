+++
id = "overview"
title = "Two ways to ship, two ways to price"
file = "src/main/kotlin/Main.kt"
+++

The shop offers two shipping options. Standard costs 4.90 or 6.90 depending on the weight, and is free from 50.00.
Express costs 12.90 or 18.90, and only members get it for free. Click **Run** to see both prices for two sample
orders.

Every option has its own rules, and the shop will keep adding options. The question this template answers is: **where
should each set of rules live, so that adding an option does not mean editing the others?**

The Strategy pattern gives one answer. Give every rule set the same shape, and let the code that needs a price receive
one of them without knowing which.

In the next steps you will see the code before the pattern, the shape of a strategy, the code that uses it, and the
place where an option is chosen.
