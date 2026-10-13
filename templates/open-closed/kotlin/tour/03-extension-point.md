+++
id = "extension-point"
title = "One question per discount"
file = "src/main/kotlin/pricing/DiscountRule.kt"
region = "extension-point"
also = ["src/main/kotlin/pricing/rules/MemberDiscount.kt"]
+++

`DiscountRule` is the *extension point*: the shape every discount must have. It asks one question: given this order
and its subtotal, which discount do you give, if any? The answer, a nullable `Discount`, carries both the amount and the
label, so the price and the receipt can no longer disagree.

`DiscountRule` is a `fun interface`, so a rule does not need a class. Open `MemberDiscount.kt`: `memberDiscount` is a
lambda that holds everything about the member discount, who gets it, how much and how it reads. Changing it to 15%
touches this file and nothing else.

Each rule receives the full subtotal, not the price left after the other rules. That keeps the rules independent of
each other's order. If a business rule needs discounts to stack in a fixed order, that order becomes part of the
extension point, and every rule has to respect it.
