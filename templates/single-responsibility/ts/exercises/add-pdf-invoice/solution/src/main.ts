import { InMemoryOrderRepository } from './orders/order-repository.ts'
import { OrderService } from './orders/order-service.ts'
import { formatMoney, money } from './shop/money.ts'

const orderService = new OrderService({
  orders: new InMemoryOrderRepository(),
  notifier: { notify: (recipient, message) => console.log(`email to ${recipient}\n${message}\n`) },
  pdf: {
    write: (document) => {
      console.log(`pdf ${JSON.stringify(document)}\n`)
      return new Uint8Array()
    },
  },
})

const ada = orderService.placeOrder({
  customer: { name: 'Ada', email: 'ada@example.com', tier: 'regular' },
  lines: [
    { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
    { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
  ],
})
console.log(`${ada.orderId} placed, ${formatMoney(ada.total)} to pay\n`)

const grace = orderService.placeOrder({
  customer: { name: 'Grace', email: 'grace@example.com', tier: 'member' },
  lines: [{ sku: 'KETTLE-01', unitPrice: money(5990), quantity: 1 }],
})
console.log(`${grace.orderId} placed, ${formatMoney(grace.total)} to pay\n`)

orderService.downloadInvoice(grace.orderId)
