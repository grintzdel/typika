import { InvalidOrderError, type OrderId } from '../domain/order.ts'
import type { OrderUseCases } from '../ports.ts'

export type ImportReport = {
  readonly imported: readonly OrderId[]
  readonly rejectedLines: readonly number[]
}

export class CsvImportAdapter {
  private readonly orders: OrderUseCases

  constructor(orders: OrderUseCases) {
    this.orders = orders
  }

  importOrders(csv: string): ImportReport {
    const imported: OrderId[] = []
    const rejectedLines: number[] = []
    const [, ...rows] = csv.trim().split('\n')
    rows.forEach((row, index) => {
      const [email = '', name = '', sku = '', unitPriceCents = '', quantity = ''] = row.split(',')
      try {
        const order = this.orders.placeOrder({
          customer: { name, email },
          lines: [{ sku, unitPriceCents: Number(unitPriceCents), quantity: Number(quantity) }],
        })
        imported.push(order.id)
      } catch (error) {
        if (!(error instanceof InvalidOrderError)) throw error
        rejectedLines.push(index + 2)
      }
    })
    return { imported, rejectedLines }
  }
}
