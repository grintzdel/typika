+++
id = "split-by-client"
title = "Each client declares what it needs"
file = "internal/checkout/checkout.go"
region = "split"
also = ["internal/checkout/refunds.go", "internal/wallet/wallet.go", "internal/teaclub/tea_club.go"]
+++

`PaymentGateway` is gone, and the `payments` package declares no interface at all. Each client now declares the one
it needs, in its own package: `Checkout` asks for a `Charger`, `Refunds` for a `Refunder`, `Wallet` for a `CardSaver`,
`TeaClub` for a `Subscriber`. One method each, named after it with `-er`, as Go names `io.Reader`.

This works because Go interfaces are satisfied implicitly. `CardGateway` never says that it implements `Charger`, and
`payments` does not even import `checkout`. If a type has the method, it fits. So the interface belongs to the code that
calls it, not to the code that provides it: "accept interfaces, return structs".

Open `wallet.go`: a bank transfer has no `SaveCard`, so `wallet.New` refuses it at compile time. And
`checkout_test.go` passes a fake with a single `Charge` method.
