+++
id = "fat-interface"
title = "Methods nobody calls"
+++

Before this template, every payment method implemented the same interface:

```ts
interface PaymentGateway {
  charge(amount: Money): Payment
  refund(payment: Payment): void
  saveCard(customerEmail: string, cardNumber: string): CardToken
  subscribe(card: CardToken, monthlyFee: Money): void
}
```

`BankTransferGateway` had to provide all four, so two of them threw: `Bank transfers do not store cards`. Nothing in
the types tells you which gateway really supports what. The type checker happily accepts a bank transfer in the
wallet, and the error waits for runtime.

The clients pay too. `Checkout` only charges, yet it depends on `saveCard` and `subscribe`. A change to the
subscription signature touches every gateway, and every test fake of a checkout needs four methods to compile.

Open **Diff from base** to see the full before and after.
