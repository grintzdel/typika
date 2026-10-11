import type { Order } from '../shop/order.ts'

export interface Parcel {
  readonly trackingPrefix: string
  readonly deliveryDays: number
  labelFor(order: Order, trackingNumber: string): string
}

export type Shipment = {
  readonly trackingNumber: string
  readonly label: string
  readonly deliveryDays: number
}
