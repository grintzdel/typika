+++
id = "split-by-client"
title = "One interface per client"
file = "src/main/kotlin/payments/Capabilities.kt"
region = "split"
also = ["src/main/kotlin/payments/clients/Checkout.kt", "src/main/kotlin/payments/clients/Wallet.kt"]
+++

The four methods become four interfaces, one per client that calls them. `Checkout` charges, so it asks for
`Chargeable`. `Refunds` asks for `Refundable`, `Wallet` for `CardVault`, `TeaClub` for `RecurringPayments`.

Open `Checkout.kt`. It receives a `Chargeable` for each payment method and could not call `saveCard` even by mistake.
Open `Wallet.kt`: it receives a `CardVault`, and a bank transfer simply does not fit. The question "can this method
store cards?" is now answered by the compiler.

The split follows the clients, not the gateways. Nobody asked "what can a card do?". Each interface is the answer to
"what does this client need?". That is why the names describe a role, not a provider.

Each role has a single method, so each is a `fun interface`. `CheckoutTest.kt` shows the payoff in tests: the fake is
a lambda, `Chargeable { amount -> … }`.
