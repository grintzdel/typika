import type { OrderLineRow } from '../../infrastructure/in-memory-database.ts'

// #region tour:commands
export type PlaceOrder = {
  readonly type: 'PlaceOrder'
  readonly customer: { readonly name: string; readonly email: string }
  readonly lines: readonly OrderLineRow[]
}

export type PayOrder = { readonly type: 'PayOrder'; readonly orderId: string; readonly cardToken: string }
export type ShipOrder = { readonly type: 'ShipOrder'; readonly orderId: string }
export type DeliverOrder = { readonly type: 'DeliverOrder'; readonly orderId: string }
export type CancelOrder = { readonly type: 'CancelOrder'; readonly orderId: string; readonly reason: string }

export type OrderCommand = PlaceOrder | PayOrder | ShipOrder | DeliverOrder | CancelOrder

export type CommandResult =
  | { readonly accepted: true; readonly orderId: string }
  | {
      readonly accepted: false
      readonly rejection: 'invalid' | 'not-found' | 'conflict' | 'payment-declined'
      readonly reason: string
    }
// #endregion
