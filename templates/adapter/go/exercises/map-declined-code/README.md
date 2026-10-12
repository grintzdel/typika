# Decline the codes the adapter does not know

Customers have been receiving their orders without being charged. The payment log shows charges that LegacyPay
refused, with code `05` ("do not honour") or `59` ("suspected fraud"), while the shop recorded them as paid.

The adapter must turn every LegacyPay response into the right `ChargeResult`. A charge is approved only when
LegacyPay says so; any other code the shop does not handle specifically is a refusal.

Start with `internal/payments/legacypay_adapter.go`. The codes are listed in `internal/legacypay/client.go`. The
expected behaviour is in `internal/checkout/checkout_test.go` and `internal/payments/legacypay_adapter_test.go`.

Done when all tests pass.
