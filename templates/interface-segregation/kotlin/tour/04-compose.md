+++
id = "compose"
title = "One class, several roles"
file = "src/main/kotlin/app/OpenShop.kt"
region = "compose"
also = [
  "src/main/kotlin/payments/gateways/CardGateway.kt",
  "src/main/kotlin/payments/gateways/BankTransferGateway.kt",
]
+++

Small interfaces do not mean small classes. `CardGateway` still talks to one card provider, and it implements all four
interfaces. `BankTransferGateway` implements `Chargeable` and `Refundable`, and nothing forces it to pretend more.

`openShop` is where the roles meet. The same `card` object goes to `Checkout` as a `Chargeable`, to `Wallet` as a
`CardVault` and to `TeaClub` as `RecurringPayments`. Each client sees one face of it.

A new payment method declares the roles it can play and joins only the clients that need them. A gift card that can
only be charged implements `Chargeable`, is added to `Checkout`, and leaves the wallet, the tea club and, if the
business decides so, the refunds untouched.
