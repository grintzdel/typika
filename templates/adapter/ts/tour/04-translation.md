+++
id = "translation"
title = "The adapter translates"
file = "src/payments/legacy-pay-adapter.ts"
region = "translation"
+++

`LegacyPayAdapter` *implements* `PaymentGateway` and *holds* a `LegacyPayClient`. Each method takes a call in the
shop's language and makes the matching call in the SDK's.

`charge` turns `Money` into what LegacyPay expects: the amount in cents, and the currency as its ISO numeric code,
looked up in `NUMERIC_CURRENCY_CODES`. `refund` turns a refund into a `reversePayment`.

The adapter adds no business rule. It does not decide what to tell the customer or whether to retry: it only
translates. Keep it that way, and replacing it stays a matter of writing another translation.

This is the only class in the shop that imports the SDK. Everything LegacyPay-specific is in one file of under fifty
lines.
