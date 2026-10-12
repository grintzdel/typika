+++
id = "fat-interface"
title = "Methods nobody calls"
+++

Before this template, the `payments` package declared one interface next to its gateways:

```go
type PaymentGateway interface {
	Charge(amount shop.Money) (Payment, error)
	Refund(payment Payment) error
	SaveCard(customerEmail, cardNumber string) (CardToken, error)
	Subscribe(card CardToken, monthlyFee shop.Money) error
}
```

`BankTransferGateway` had to provide all four, so two of them returned an error: `bank transfers do not store cards`.
Nothing in the types tells you which gateway really supports what. The compiler happily accepts a bank transfer in
`wallet.New`, and the error waits for runtime.

The clients pay too. `Checkout` only charges, yet it depends on `SaveCard` and `Subscribe`. A change to the
subscription signature touches every gateway, and every test fake of a checkout needs four methods to compile.

Open **Diff from base** to see the full before and after.
