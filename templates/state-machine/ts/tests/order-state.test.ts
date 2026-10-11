import { describe, expect, it } from 'vitest'
import { InvalidTransitionError, transition } from '../src/orders/order-state.ts'

const at = new Date('2026-10-03T09:00:00Z')

describe('order state machine', () => {
  it('moves a paid order to shipped', () => {
    expect(transition({ status: 'paid' }, 'ship', { at })).toEqual({ status: 'shipped' })
  })

  it('keeps the delivery date in the delivered state', () => {
    expect(transition({ status: 'shipped' }, 'deliver', { at })).toEqual({ status: 'delivered', deliveredAt: at })
  })

  it('refuses a transition the table does not list, with a typed error', () => {
    const attempt = () => transition({ status: 'pending' }, 'deliver', { at })

    expect(attempt).toThrow(InvalidTransitionError)
    expect(attempt).toThrow('Cannot deliver an order that is pending')
  })
})
