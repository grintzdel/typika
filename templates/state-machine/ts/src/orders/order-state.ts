// #region tour:states
export type OrderState =
  | { readonly status: 'pending' }
  | { readonly status: 'paid' }
  | { readonly status: 'shipped' }
  | { readonly status: 'delivered'; readonly deliveredAt: Date }
  | { readonly status: 'cancelled'; readonly reason: string }

export type OrderStatus = OrderState['status']
// #endregion

export type OrderAction = 'pay' | 'ship' | 'deliver' | 'cancel'

export class InvalidTransitionError extends Error {
  readonly from: OrderStatus
  readonly action: OrderAction

  constructor(from: OrderStatus, action: OrderAction) {
    super(`Cannot ${action} an order that is ${from}`)
    this.from = from
    this.action = action
  }
}

export type TransitionContext = {
  readonly at: Date
  readonly reason?: string
}

const ENTER: { readonly [S in OrderStatus]: (context: TransitionContext) => Extract<OrderState, { status: S }> } = {
  pending: () => ({ status: 'pending' }),
  paid: () => ({ status: 'paid' }),
  shipped: () => ({ status: 'shipped' }),
  delivered: ({ at }) => ({ status: 'delivered', deliveredAt: at }),
  cancelled: ({ reason = 'no reason given' }) => ({ status: 'cancelled', reason }),
}

// #region tour:transitions
const TRANSITIONS: Readonly<Record<OrderStatus, Partial<Record<OrderAction, OrderStatus>>>> = {
  pending: { pay: 'paid', cancel: 'cancelled' },
  paid: { ship: 'shipped', cancel: 'cancelled' },
  shipped: { deliver: 'delivered' },
  delivered: {},
  cancelled: {},
}

export const transition = (state: OrderState, action: OrderAction, context: TransitionContext): OrderState => {
  const next = TRANSITIONS[state.status][action]
  if (next === undefined) throw new InvalidTransitionError(state.status, action)
  return ENTER[next](context)
}
// #endregion
