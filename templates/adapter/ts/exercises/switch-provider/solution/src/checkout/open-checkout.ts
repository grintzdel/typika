import { LegacyPayAdapter } from '../payments/legacy-pay-adapter.ts'
import type { PaymentGateway } from '../payments/payment-gateway.ts'
import { SwiftPayAdapter } from '../payments/swift-pay-adapter.ts'
import type { LegacyPayClient } from '../vendor/legacy-pay/legacy-pay-client.ts'
import type { SwiftPayClient } from '../vendor/swift-pay/swift-pay-client.ts'
import { Cancellation } from './cancellation.ts'
import { Checkout } from './checkout.ts'

export type CheckoutDesk = {
  readonly checkout: Checkout
  readonly cancellation: Cancellation
}

const deskFor = (payments: PaymentGateway): CheckoutDesk => ({
  checkout: new Checkout(payments),
  cancellation: new Cancellation(payments),
})

export const openCheckout = (client: LegacyPayClient): CheckoutDesk => deskFor(new LegacyPayAdapter(client))

export const openCheckoutWithSwiftPay = (client: SwiftPayClient): CheckoutDesk => deskFor(new SwiftPayAdapter(client))
