import { vi } from 'vitest'
import { InMemoryOrderRepository } from '../src/orders/order-repository.ts'

export const fakeServices = () => ({
  orders: new InMemoryOrderRepository(),
  notifier: { notify: vi.fn() },
})
