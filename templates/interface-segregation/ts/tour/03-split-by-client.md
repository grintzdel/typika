+++
id = "split-by-client"
title = "One interface per client"
file = "src/payments/capabilities.ts"
region = "split"
also = ["src/payments/clients/checkout.ts", "src/payments/clients/wallet.ts"]
+++

The four methods become four interfaces, one per client that calls them. `Checkout` charges, so it asks for
`Chargeable`. `Refunds` asks for `Refundable`, `Wallet` for `CardVault`, `TeaClub` for `RecurringPayments`.

Open `checkout.ts`. It receives a `Chargeable` for each payment method and could not call `saveCard` even by mistake.
Open `wallet.ts`: it receives a `CardVault`, and a bank transfer simply does not fit. The question "can this method
store cards?" is now answered by the compiler.

The split follows the clients, not the gateways. Nobody asked "what can a card do?". Each interface is the answer to
"what does this client need?". That is why the names describe a role, not a provider.

`tests/checkout.test.ts` shows the payoff in tests: a fake with a single `charge` method is enough.
