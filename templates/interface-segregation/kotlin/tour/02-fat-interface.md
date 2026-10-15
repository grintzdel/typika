+++
id = "fat-interface"
title = "Methods nobody calls"
+++

Before this template, every payment method implemented the same interface:

```kotlin
interface PaymentGateway {
    fun charge(amount: Money): Payment
    fun refund(payment: Payment)
    fun saveCard(customerEmail: String, cardNumber: String): CardToken
    fun subscribe(card: CardToken, monthlyFee: Money)
}
```

`BankTransferGateway` had to override all four, so two of them threw `UnsupportedOperationException`. Nothing in the
types tells you which gateway really supports what. The compiler happily accepts a bank transfer in the wallet, and
the error waits for runtime.

The clients pay too. `Checkout` only charges, yet it depends on `saveCard` and `subscribe`. A change to the
subscription signature touches every gateway, and every test fake of a checkout needs four overrides to compile.

Open **Diff from base** to see the full before and after.
