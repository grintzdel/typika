+++
id = "compose"
title = "One struct, several roles"
file = "internal/app/open_shop.go"
region = "compose"
also = ["internal/payments/card.go", "internal/payments/bank_transfer.go"]
+++

Small interfaces do not mean small structs. `CardGateway` still talks to one card provider, and it has all four
methods. `BankTransferGateway` has `Charge` and `Refund`, and nothing forces it to pretend more.

`OpenShop` is where the roles meet. The same `card` value goes to `checkout.New` as a `Charger`, to `wallet.New` as a
`CardSaver` and to `teaclub.New` as a `Subscriber`. Each client sees one face of it. This is also where the compiler
checks the fit: there is no `implements` clause, so a missing method shows up as an error on these lines.

A new payment method only needs the methods it can honour, and joins only the clients that call them. A gift card
that can only be charged has a `Charge` method, is added to the checkout map, and leaves the wallet, the tea club and,
if the business decides so, the refunds untouched.
