import type { Customer, OrderEvent, OrderLine } from './order-events.ts'

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export type Order = {
  readonly id: string
  readonly customer: Customer
  readonly totalCents: number
  readonly status: OrderStatus
  readonly chargeId: string | null
}

export type OrderCommand =
  | {
      readonly type: 'PlaceOrder'
      readonly orderId: string
      readonly customer: Customer
      readonly lines: readonly OrderLine[]
    }
  | { readonly type: 'PayOrder'; readonly chargeId: string }
  | { readonly type: 'ShipOrder' }
  | { readonly type: 'DeliverOrder' }
  | { readonly type: 'CancelOrder'; readonly reason: string }

export type Rejection = {
  readonly accepted: false
  readonly rejection: 'invalid' | 'not-found' | 'conflict'
  readonly reason: string
}

export type Decision = { readonly accepted: true; readonly events: readonly OrderEvent[] } | Rejection

const accept = (...events: OrderEvent[]): Decision => ({ accepted: true, events })
const reject = (rejection: Rejection['rejection'], reason: string): Rejection => ({
  accepted: false,
  rejection,
  reason,
})

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0

const checkNewOrder = ({ customer, lines }: { customer: Customer; lines: readonly OrderLine[] }) => {
  if (customer.name === '') return reject('invalid', 'A customer name is required')
  if (!customer.email.includes('@')) return reject('invalid', 'A valid customer email is required')
  if (lines.length === 0) return reject('invalid', 'An order needs at least one line')
  for (const line of lines) {
    if (line.sku === '') return reject('invalid', 'Each line needs a sku')
    if (!isPositiveInteger(line.unitPriceCents) || !isPositiveInteger(line.quantity)) {
      return reject('invalid', `Line ${line.sku} needs a positive whole price and quantity`)
    }
  }
  return undefined
}

export const paymentRefusal = (order: Order): Rejection | undefined => {
  if (order.status === 'cancelled') return reject('conflict', `Order ${order.id} is cancelled`)
  if (order.status !== 'pending') return reject('conflict', `Order ${order.id} is already paid`)
  return undefined
}

// #region tour:decide
export const decide = (order: Order | undefined, command: OrderCommand, occurredAt: Date): Decision => {
  if (command.type === 'PlaceOrder') {
    if (order !== undefined) return reject('conflict', `Order ${order.id} already exists`)
    const { orderId, customer, lines } = command
    const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
    return checkNewOrder(command) ?? accept({ type: 'OrderPlaced', orderId, customer, lines, totalCents, occurredAt })
  }
  if (order === undefined) return reject('not-found', 'Order not found')
  const orderId = order.id
  switch (command.type) {
    case 'PayOrder':
      return (
        paymentRefusal(order) ??
        accept({ type: 'OrderPaid', orderId, chargeId: command.chargeId, totalCents: order.totalCents, occurredAt })
      )
    case 'ShipOrder':
      if (order.status === 'cancelled') return reject('conflict', `Order ${orderId} is cancelled`)
      if (order.status === 'pending') return reject('conflict', `Order ${orderId} is not paid`)
      if (order.status !== 'paid') return reject('conflict', `Order ${orderId} has already shipped`)
      return accept({ type: 'OrderShipped', orderId, occurredAt })
    case 'DeliverOrder':
      if (order.status !== 'shipped') return reject('conflict', `Order ${orderId} is not on its way`)
      return accept({ type: 'OrderDelivered', orderId, occurredAt })
    case 'CancelOrder':
      if (order.status === 'shipped' || order.status === 'delivered') {
        return reject('conflict', `Order ${orderId} has already shipped`)
      }
      if (order.status === 'cancelled') return reject('conflict', `Order ${orderId} is already cancelled`)
      return accept({ type: 'OrderCancelled', orderId, reason: command.reason, occurredAt })
  }
}
// #endregion

// #region tour:rehydration
export const evolve = (order: Order | undefined, event: OrderEvent): Order => {
  if (event.type === 'OrderPlaced') {
    const { orderId, customer, totalCents } = event
    return { id: orderId, customer, totalCents, status: 'pending', chargeId: null }
  }
  if (order === undefined) throw new Error(`${event.type} cannot start the stream of order ${event.orderId}`)
  switch (event.type) {
    case 'OrderPaid':
      return { ...order, status: 'paid', chargeId: event.chargeId }
    case 'OrderShipped':
      return { ...order, status: 'shipped' }
    case 'OrderDelivered':
      return { ...order, status: 'delivered' }
    case 'OrderCancelled':
      return { ...order, status: 'cancelled' }
  }
}

export const rehydrate = (events: readonly OrderEvent[]): Order | undefined =>
  events.reduce<Order | undefined>(evolve, undefined)
// #endregion
