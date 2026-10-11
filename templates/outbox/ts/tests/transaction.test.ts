import { describe, expect, it } from 'vitest'
import { InMemoryDatabase } from '../src/infrastructure/in-memory-database.ts'

describe('database transaction', () => {
  it('keeps the order and its outbox entry together when the work fails', () => {
    const db = new InMemoryDatabase()

    expect(() =>
      db.transaction(() => {
        const id = db.nextOrderId()
        db.addToOutbox('OrderPlaced', { orderId: id })
        throw new Error('disk full')
      })
    ).toThrow('disk full')

    expect(db.outbox).toEqual([])
    expect(db.nextOrderId()).toBe('order-1')
  })
})
