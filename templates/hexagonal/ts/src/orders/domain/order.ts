import { addMoney, money, multiplyMoney, ZERO, type Money } from '../../shop/money.ts'

export type OrderId = string

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export type Customer = {
  readonly name: string
  readonly email: string
}

export type OrderLine = {
  readonly sku: string
  readonly unitPrice: Money
  readonly quantity: number
}

export type Order = {
  readonly id: OrderId
  readonly customer: Customer
  readonly lines: readonly OrderLine[]
  readonly total: Money
  readonly placedAt: Date
  readonly chargeId: string | null
  readonly deliveredAt: Date | null
  readonly isPaid: boolean
  readonly isShipped: boolean
  readonly isDelivered: boolean
  readonly isCancelled: boolean
}

export type UnsavedOrder = Omit<Order, 'id'>

export type OrderLineRequest = {
  readonly sku: string
  readonly unitPriceCents: number
  readonly quantity: number
}

export type OrderRequest = {
  readonly customer: Customer
  readonly lines: readonly OrderLineRequest[]
}

export class InvalidOrderError extends Error {}
export class OrderNotFoundError extends Error {}
export class OrderConflictError extends Error {}
export class PaymentDeclinedError extends Error {}

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0

// #region tour:domain
export const createOrder = ({ customer, lines }: OrderRequest, placedAt: Date): UnsavedOrder => {
  if (customer.name === '') throw new InvalidOrderError('A customer name is required')
  if (!customer.email.includes('@')) throw new InvalidOrderError('A valid customer email is required')
  if (lines.length === 0) throw new InvalidOrderError('An order needs at least one line')
  for (const line of lines) {
    if (line.sku === '') throw new InvalidOrderError('Each line needs a sku')
    if (!isPositiveInteger(line.unitPriceCents) || !isPositiveInteger(line.quantity)) {
      throw new InvalidOrderError(`Line ${line.sku} needs a positive whole price and quantity`)
    }
  }

  const orderLines = lines.map(({ sku, unitPriceCents, quantity }) => ({
    sku,
    unitPrice: money(unitPriceCents),
    quantity,
  }))
  return {
    customer,
    lines: orderLines,
    total: orderLines.reduce((sum, line) => addMoney(sum, multiplyMoney(line.unitPrice, line.quantity)), ZERO),
    placedAt,
    chargeId: null,
    deliveredAt: null,
    isPaid: false,
    isShipped: false,
    isDelivered: false,
    isCancelled: false,
  }
}
// #endregion

export const ensurePayable = (order: Order): void => {
  if (order.isCancelled) throw new OrderConflictError(`Order ${order.id} is cancelled`)
  if (order.isPaid) throw new OrderConflictError(`Order ${order.id} is already paid`)
}

export const markPaid = (order: Order, chargeId: string): Order => ({ ...order, isPaid: true, chargeId })

export const ship = (order: Order): Order => {
  if (order.isCancelled) throw new OrderConflictError(`Order ${order.id} is cancelled`)
  if (!order.isPaid) throw new OrderConflictError(`Order ${order.id} is not paid`)
  if (order.isShipped) throw new OrderConflictError(`Order ${order.id} has already shipped`)
  return { ...order, isShipped: true }
}

export const deliver = (order: Order, deliveredAt: Date): Order => {
  if (!order.isShipped || order.isDelivered) throw new OrderConflictError(`Order ${order.id} is not on its way`)
  return { ...order, isDelivered: true, deliveredAt }
}

export const cancel = (order: Order): Order => {
  if (order.isShipped) throw new OrderConflictError(`Order ${order.id} has already shipped`)
  if (order.isCancelled) throw new OrderConflictError(`Order ${order.id} is already cancelled`)
  return { ...order, isCancelled: true }
}

export const statusOf = (order: Order): OrderStatus => {
  if (order.isCancelled) return 'cancelled'
  if (order.isDelivered) return 'delivered'
  if (order.isShipped) return 'shipped'
  if (order.isPaid) return 'paid'
  return 'pending'
}
