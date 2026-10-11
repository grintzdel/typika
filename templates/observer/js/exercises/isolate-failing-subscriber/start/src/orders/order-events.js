export const ORDER_PLACED = 'order-placed'

// #region tour:subject
export class OrderEvents extends EventTarget {
  #onSubscriberError

  constructor(onSubscriberError) {
    super()
    this.#onSubscriberError = onSubscriberError
  }

  subscribe(subscriber, { signal } = {}) {
    // #region tour:isolation
    const listener = ({ detail }) => subscriber(detail)
    // #endregion
    this.addEventListener(ORDER_PLACED, listener, { signal })
  }

  publish(orderPlaced) {
    this.dispatchEvent(new CustomEvent(ORDER_PLACED, { detail: orderPlaced }))
  }
}
// #endregion
