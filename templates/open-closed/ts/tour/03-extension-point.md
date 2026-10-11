+++
id = "extension-point"
title = "One question per discount"
file = "src/pricing/discount-rule.ts"
region = "extension-point"
also = ["src/pricing/rules/member-discount.ts"]
+++

`DiscountRule` is the *extension point*: the shape every discount must have. It asks one question: given this order
and its subtotal, which discount do you give, if any? The answer, a `Discount`, carries both the amount and the label,
so the price and the receipt can no longer disagree.

Now open `member-discount.ts`. `MemberDiscount` holds everything about the member discount: who gets it, how much, how
it reads. Changing it to 15% touches this file and nothing else.

Each rule receives the full subtotal, not the price left after the other rules. That keeps the rules independent of
each other's order. If a business rule needs discounts to stack in a fixed order, that order becomes part of the
extension point, and every rule has to respect it.
