import type { HttpRequest, HttpResponse } from '../http.ts'
import type { OrderLineRow } from '../infrastructure/in-memory-database.ts'
import type { CustomerOrderSummaries } from './read/customer-order-summaries.ts'
import type { OrderViews } from './read/order-views.ts'
import type { RevenueByDay } from './read/revenue-by-day.ts'
import type { CommandResult, OrderCommand, PlaceOrder } from './write/order-commands.ts'
import type { OrderCommandHandler } from './write/order-command-handler.ts'

export type OrdersHandlerDependencies = {
  readonly commands: OrderCommandHandler
  readonly orderViews: OrderViews
  readonly customerSummaries: CustomerOrderSummaries
  readonly revenueByDay: RevenueByDay
}

type Json = Readonly<Record<string, unknown>>

const isJson = (value: unknown): value is Json => typeof value === 'object' && value !== null

const reply = (status: number, body: Json): HttpResponse => ({ status, body })
const fail = (status: number, error: string): HttpResponse => reply(status, { error })

const STATUS_OF_REJECTION = { invalid: 400, 'payment-declined': 402, 'not-found': 404, conflict: 409 } as const

const readPlaceOrder = ({ customer, lines }: Json): PlaceOrder | undefined => {
  if (!isJson(customer) || typeof customer.name !== 'string' || typeof customer.email !== 'string') return undefined
  if (!Array.isArray(lines)) return undefined
  const orderLines: OrderLineRow[] = []
  for (const line of lines) {
    if (!isJson(line) || typeof line.sku !== 'string') return undefined
    if (typeof line.unitPriceCents !== 'number' || typeof line.quantity !== 'number') return undefined
    orderLines.push({ sku: line.sku, unitPriceCents: line.unitPriceCents, quantity: line.quantity })
  }
  return { type: 'PlaceOrder', customer: { name: customer.name, email: customer.email }, lines: orderLines }
}

const readOrderCommand = (orderId: string, action: string | undefined, body: Json): OrderCommand | undefined => {
  if (action === 'pay' && typeof body.cardToken === 'string') {
    return { type: 'PayOrder', orderId, cardToken: body.cardToken }
  }
  if (action === 'ship') return { type: 'ShipOrder', orderId }
  if (action === 'deliver') return { type: 'DeliverOrder', orderId }
  if (action === 'cancel') {
    return { type: 'CancelOrder', orderId, reason: typeof body.reason === 'string' ? body.reason : 'no reason given' }
  }
  return undefined
}

export class OrdersHandler {
  private readonly commands: OrderCommandHandler
  private readonly orderViews: OrderViews
  private readonly customerSummaries: CustomerOrderSummaries
  private readonly revenueByDay: RevenueByDay

  constructor({ commands, orderViews, customerSummaries, revenueByDay }: OrdersHandlerDependencies) {
    this.commands = commands
    this.orderViews = orderViews
    this.customerSummaries = customerSummaries
    this.revenueByDay = revenueByDay
  }

  // #region tour:routes
  handle(request: HttpRequest): HttpResponse {
    const body = isJson(request.body) ? request.body : {}
    const [, resource, id, action] = request.path.split('/')
    if (request.method === 'POST' && resource === 'orders' && id === undefined) {
      const command = readPlaceOrder(body)
      if (command === undefined) return fail(400, 'The order request is malformed')
      return this.replyTo(this.commands.execute(command), 201)
    }
    if (request.method === 'POST' && resource === 'orders' && id !== undefined) {
      const command = readOrderCommand(id, action, body)
      if (command === undefined) return fail(400, `Cannot ${action ?? 'update'} order ${id} with this request`)
      return this.replyTo(this.commands.execute(command), 200)
    }
    if (request.method === 'GET' && resource === 'orders' && id !== undefined) {
      const view = this.orderViews.find(id)
      return view === undefined ? fail(404, `Order ${id} not found`) : reply(200, view)
    }
    if (request.method === 'GET' && resource === 'customers' && action === 'orders' && id !== undefined) {
      return reply(200, this.customerSummaries.forCustomer(decodeURIComponent(id)))
    }
    if (request.method === 'GET' && resource === 'revenue' && id === 'daily') {
      return reply(200, { days: this.revenueByDay.all() })
    }
    return fail(404, `No route for ${request.method} ${request.path}`)
  }
  // #endregion

  private replyTo(result: CommandResult, status: 200 | 201): HttpResponse {
    if (!result.accepted) return fail(STATUS_OF_REJECTION[result.rejection], result.reason)
    const view = this.orderViews.find(result.orderId)
    if (view === undefined) return fail(500, `Order ${result.orderId} has no view`)
    return status === 201
      ? reply(201, { orderId: view.orderId, totalCents: view.totalCents })
      : reply(200, { orderId: view.orderId, status: view.status })
  }
}
