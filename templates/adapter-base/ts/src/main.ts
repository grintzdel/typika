import { openCheckout } from './checkout/open-checkout.ts'
import { formatMoney, money } from './shop/money.ts'
import { totalOf, type Order } from './shop/order.ts'
import { LegacyPayClient } from './vendor/legacy-pay/legacy-pay-client.ts'

const { checkout, cancellation } = openCheckout(new LegacyPayClient())

const order: Order = {
  customer: { name: 'Ada', tier: 'regular' },
  lines: [
    { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
    { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
  ],
}

console.log(`Ada checks out ${formatMoney(totalOf(order))}`)
for (const token of ['tok_no_funds', 'tok_expired', 'tok_issuer_down', 'tok_visa']) {
  const outcome = checkout.pay(order, { token })
  const detail = outcome.status === 'declined' ? outcome.message : outcome.status === 'paid' ? outcome.paymentId : ''
  console.log(`  ${token.padEnd(16)} ${outcome.status} ${detail}`)

  if (outcome.status === 'paid') {
    console.log(`Ada cancels the order`)
    console.log(`  refund ${outcome.paymentId}  ${cancellation.cancel(outcome.paymentId, outcome.amount).status}`)
  }
}
