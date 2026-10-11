import { describe, expect, it, vi } from 'vitest'
import { OrderEvents, type OrderPlaced } from '../src/orders/order-events.ts'
import { money } from '../src/shop/money.ts'
import { ada, orderOf } from './order-fixture.ts'

const orderPlaced: OrderPlaced = { orderId: 'order-1', order: orderOf(ada, 1000), total: money(1000) }

describe('OrderEvents', () => {
  it('notifies every subscriber of a published event', () => {
    const events = new OrderEvents(vi.fn())
    const first = vi.fn()
    const second = vi.fn()
    events.subscribe(first)
    events.subscribe(second)

    events.publish(orderPlaced)

    expect(first).toHaveBeenCalledWith(orderPlaced)
    expect(second).toHaveBeenCalledWith(orderPlaced)
  })

  it('stops notifying a subscriber once it unsubscribes', () => {
    const events = new OrderEvents(vi.fn())
    const subscriber = vi.fn()
    const unsubscribe = events.subscribe(subscriber)

    unsubscribe()
    events.publish(orderPlaced)

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('keeps notifying the other subscribers when one throws', () => {
    const events = new OrderEvents(vi.fn())
    const after = vi.fn()
    events.subscribe(() => {
      throw new Error('Stock service timed out')
    })
    events.subscribe(after)

    events.publish(orderPlaced)

    expect(after).toHaveBeenCalledWith(orderPlaced)
  })

  it('reports the error of a failing subscriber', () => {
    const onSubscriberError = vi.fn()
    const events = new OrderEvents(onSubscriberError)
    const failure = new Error('Stock service timed out')
    events.subscribe(() => {
      throw failure
    })

    events.publish(orderPlaced)

    expect(onSubscriberError).toHaveBeenCalledWith(failure)
  })
})
