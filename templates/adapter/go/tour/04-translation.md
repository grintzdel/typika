+++
id = "translation"
title = "The adapter translates"
file = "internal/payments/legacypay_adapter.go"
region = "translation"
+++

`LegacyPayAdapter` holds a `*legacypay.Client` and has the two methods of `Gateway`. Each one takes a call in the
shop's language and makes the matching call in the SDK's.

`Charge` turns `shop.Money` into what LegacyPay expects: the amount in cents, and the currency as its ISO numeric code,
looked up in `numericCurrencyCodes`. `Refund` turns a refund into a `ReversePayment`, and a refusal into an `error`.

Go never asks the adapter to declare that it implements `Gateway`. The line `var _ Gateway = (*LegacyPayAdapter)(nil)`
asks the compiler to check it anyway, here, rather than wherever the adapter is first used.

The adapter adds no business rule: it only translates. This is the only package of the shop that imports the SDK.
