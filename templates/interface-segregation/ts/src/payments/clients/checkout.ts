import type { Money } from '../../shop/money.ts'
import type { Chargeable } from '../capabilities.ts'
import type { Payment, PaymentMethod } from '../payment.ts'

export class Checkout {
  private readonly methods: Readonly<Record<PaymentMethod, Chargeable>>

  constructor(methods: Readonly<Record<PaymentMethod, Chargeable>>) {
    this.methods = methods
  }

  pay(method: PaymentMethod, amount: Money): Payment {
    return this.methods[method].charge(amount)
  }
}
