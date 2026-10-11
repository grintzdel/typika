import type { OrderLine } from '../shop/order.ts'

export interface Stock {
  reserve(lines: readonly OrderLine[]): void
}
