+++
id = "foreign-interface"
title = "The SDK, everywhere"
file = "internal/legacypay/client.go"
+++

This is the SDK. `MakePayment` takes cents, a numeric currency code and a card token, and returns a `Response` with a
`Code`. The meaning of each code lives in the `Code…` constants: `CodeApproved` is `0`, everything else is some kind
of failure.

Before the pattern, the checkout called it directly:

```go
response := c.client.MakePayment(amount.Cents(), eurNumericCode, card.Token)

switch response.Code {
case legacypay.CodeApproved:
	return PaymentOutcome{Status: Paid, PaymentID: response.Reference, Amount: amount}
case legacypay.CodeInsufficientFunds:
…
```

`Cancellation` did the same with `ReversePayment`. Both held a `*legacypay.Client`, both knew the units, the codes
and the SDK's quirks, and both would have to be rewritten to change provider.

Open **Diff from base** to see the full before and after.
