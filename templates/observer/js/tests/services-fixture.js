import { vi } from 'vitest'
import { InMemoryOrderRepository } from '../src/orders/order-repository.js'

export const fakeServices = () => ({
  orders: new InMemoryOrderRepository(),
  stock: { reserve: vi.fn() },
  notifier: { notify: vi.fn() },
  analytics: { track: vi.fn() },
})
