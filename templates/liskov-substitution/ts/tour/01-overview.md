+++
id = "overview"
title = "Not every product ships"
file = "src/main.ts"
+++

The shop sells mugs and tea, a tea set that bundles them, and an e-book. Click **Run** to check out a cart with all
three kinds: two parcels leave the warehouse, one download link is sent, and shipping is charged once.

Inheritance invites a shortcut here. An e-book has a SKU, a name and a price, like a mug, so why not make it a kind of
physical product? Because a mug makes promises the e-book cannot keep: it weighs something and it can be shipped.

The question this template answers is: **when can one type stand in for another?** The Liskov substitution principle
answers: when code written for the parent works, unchanged and without surprises, with the child.

In the next steps you will see a promise broken, the contract that replaces it, and tests that hold every product to
it.
