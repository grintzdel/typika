import type { Money } from '../../shop/money.ts'
import type { Order } from '../../shop/order.ts'
import type { ShippingCost } from '../shipping-cost.ts'

export class ExpressShipping implements ShippingCost {
  costFor(_order: Order): Money {
    throw new Error('Express shipping is not implemented yet')
  }
}
