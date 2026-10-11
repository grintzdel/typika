export class InMemoryOrderRepository {
  #orders = new Map()

  add(order) {
    const id = `order-${this.#orders.size + 1}`
    this.#orders.set(id, order)
    return id
  }
}
