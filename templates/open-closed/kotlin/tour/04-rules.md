+++
id = "rules"
title = "A list instead of a when"
file = "src/main/kotlin/pricing/DiscountRules.kt"
region = "rules"
also = ["src/main/kotlin/pricing/PriceOrder.kt", "src/main/kotlin/receipts/Receipt.kt"]
+++

`DISCOUNT_RULES` lists the rules in use, and `discountsFor` asks each of them. `mapNotNull` skips the rules that answer
`null`.

Open `PriceOrder.kt` and `Receipt.kt`. Both call `discountsFor` and neither names a discount. These are the parts that
are *closed*: a new discount does not touch them, so their tests keep proving what they proved before.

The *open* part is the list. Adding Black Friday means writing a `blackFriday` rule in its own file and adding it to
`DISCOUNT_RULES`. That is still an edit, but to a list whose only job is to say which rules are on.

`discountsFor` also takes the rules as a parameter, with the real list as its default value. `DiscountRulesTest` passes
a rule written inline as a lambda, and checks that the code applies a rule it has never seen.
