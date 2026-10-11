import type { HttpRequest, HttpResponse } from '../../http.ts'
import {
  InvalidOrderError,
  OrderConflictError,
  OrderNotFoundError,
  PaymentDeclinedError,
  statusOf,
  type Order,
  type OrderLineRequest,
  type OrderRequest,
} from '../domain/order.ts'
import type { OrderUseCases } from '../ports.ts'

type Json = Readonly<Record<string, unknown>>

const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null

const reply = (status: number, body: Json): HttpResponse => ({ status, body })
const fail = (status: number, error: string): HttpResponse => reply(status, { error })
const statusReply = (order: Order): HttpResponse => reply(200, { orderId: order.id, status: statusOf(order) })
const orderReply = (order: Order): HttpResponse =>
  reply(200, {
    orderId: order.id,
    status: statusOf(order),
    customerEmail: order.customer.email,
    totalCents: order.total.cents,
  })

const readOrderRequest = ({ customer, lines }: Json): OrderRequest | undefined => {
  if (!isJson(customer) || typeof customer.name !== 'string' || typeof customer.email !== 'string') return undefined
  if (!Array.isArray(lines)) return undefined
  const orderLines: OrderLineRequest[] = []
  for (const line of lines) {
    if (!isJson(line) || typeof line.sku !== 'string') return undefined
    if (typeof line.unitPriceCents !== 'number' || typeof line.quantity !== 'number') return undefined
    orderLines.push({ sku: line.sku, unitPriceCents: line.unitPriceCents, quantity: line.quantity })
  }
  return { customer: { name: customer.name, email: customer.email }, lines: orderLines }
}

// #region tour:driving-adapter
const errorResponse = (error: unknown): HttpResponse => {
  if (!(error instanceof Error)) throw error
  if (error instanceof InvalidOrderError) return fail(400, error.message)
  if (error instanceof PaymentDeclinedError) return fail(402, error.message)
  if (error instanceof OrderNotFoundError) return fail(404, error.message)
  if (error instanceof OrderConflictError) return fail(409, error.message)
  throw error
}

export class HttpOrdersAdapter {
  private readonly orders: OrderUseCases

  constructor(orders: OrderUseCases) {
    this.orders = orders
  }

  handle(request: HttpRequest): HttpResponse {
    try {
      return this.route(request)
    } catch (error) {
      return errorResponse(error)
    }
  }
  // #endregion

  private route(request: HttpRequest): HttpResponse {
    const body = isJson(request.body) ? request.body : {}
    const [, resource, id, action] = request.path.split('/')
    if (request.method === 'POST' && resource === 'orders' && id === undefined) {
      const orderRequest = readOrderRequest(body)
      if (orderRequest === undefined) return fail(400, 'The order request is malformed')
      const order = this.orders.placeOrder(orderRequest)
      return reply(201, { orderId: order.id, totalCents: order.total.cents })
    }
    if (request.method === 'GET' && resource === 'orders' && id !== undefined) {
      return orderReply(this.orders.findOrder(id))
    }
    if (request.method === 'GET' && resource === 'customers' && action === 'orders' && id !== undefined) {
      const { orderCount, totalSpent, lastStatus } = this.orders.customerHistory(decodeURIComponent(id))
      return reply(200, { orderCount, totalSpentCents: totalSpent.cents, lastStatus })
    }
    if (request.method === 'POST' && resource === 'orders' && id !== undefined) {
      if (action === 'pay') {
        if (typeof body.cardToken !== 'string') return fail(400, 'A card token is required')
        return statusReply(this.orders.payOrder(id, body.cardToken))
      }
      if (action === 'ship') return statusReply(this.orders.shipOrder(id))
      if (action === 'deliver') return statusReply(this.orders.deliverOrder(id))
      if (action === 'cancel') {
        const reason = typeof body.reason === 'string' ? body.reason : 'no reason given'
        return statusReply(this.orders.cancelOrder(id, reason))
      }
    }
    return fail(404, `No route for ${request.method} ${request.path}`)
  }
}
