import { openShop } from './open-shop.ts'

const { http } = openShop()

const call = (method: 'GET' | 'POST', path: string, body?: unknown) => {
  const response = http.handle({ method, path, body })
  console.log(`${method} ${path} -> ${response.status} ${JSON.stringify(response.body)}`)
}

call('POST', '/orders', {
  customer: { name: 'Ada', email: 'ada@example.com' },
  lines: [
    { sku: 'MUG-01', unitPriceCents: 1200, quantity: 2 },
    { sku: 'TEA-GREEN', unitPriceCents: 850, quantity: 1 },
  ],
})
call('POST', '/orders/order-1/pay', { cardToken: 'tok_visa' })
call('POST', '/orders/order-1/ship')
call('POST', '/orders', {
  customer: { name: 'Ada', email: 'ada@example.com' },
  lines: [{ sku: 'KETTLE-01', unitPriceCents: 5990, quantity: 1 }],
})
call('POST', '/orders/order-2/cancel', { reason: 'ordered twice' })
call('GET', '/customers/ada@example.com/orders')
