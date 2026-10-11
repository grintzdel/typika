+++
id = "rules"
title = "A list instead of a switch"
file = "src/pricing/discount-rules.ts"
region = "rules"
also = ["src/pricing/price-order.ts", "src/receipts/receipt.ts"]
+++

`DISCOUNT_RULES` lists the rules in use, and `discountsFor` asks each of them. Rules that return nothing are skipped.

Open `price-order.ts` and `receipt.ts`. Both call `discountsFor` and neither names a discount. These are the parts
that are *closed*: a new discount does not touch them, so their tests keep proving what they proved before.

The *open* part is the list. Adding Black Friday means writing a `BlackFriday` rule in its own file and adding it to
`DISCOUNT_RULES`. That is still an edit, but to a list whose only job is to say which rules are on.

`discountsFor` also takes the rules as a parameter. `tests/discount-rules.test.ts` uses it to check that a rule the
code has never seen is applied, without touching the real discounts.
