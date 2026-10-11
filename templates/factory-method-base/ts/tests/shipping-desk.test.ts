import { describe, expect, it } from 'vitest'
import { ShippingDesk } from '../src/shipping/shipping-desk.ts'
import { SequentialTrackingNumbers } from '../src/shipping/tracking-numbers.ts'
import { orderOf } from './order-fixture.ts'

const openDesk = () => new ShippingDesk(new SequentialTrackingNumbers())

describe('standard shipping', () => {
  it('ships a labelled parcel, delivered in 3 days', () => {
    expect(openDesk().ship(orderOf(800), 'standard')).toEqual({
      trackingNumber: 'STD-0001',
      label: 'STANDARD STD-0001 for Ada',
      deliveryDays: 3,
    })
  })

  it('numbers its parcels in sequence', () => {
    const desk = openDesk()
    desk.ship(orderOf(800), 'standard')

    expect(desk.ship(orderOf(800, 'Grace'), 'standard').trackingNumber).toBe('STD-0002')
  })

  it('takes heavy parcels', () => {
    expect(openDesk().ship(orderOf(30_000), 'standard').trackingNumber).toBe('STD-0001')
  })
})

describe('express shipping', () => {
  it('ships a parcel that needs a signature, delivered in 1 day', () => {
    expect(openDesk().ship(orderOf(800), 'express')).toEqual({
      trackingNumber: 'EXP-0001',
      label: 'EXPRESS EXP-0001 for Ada, signature required',
      deliveryDays: 1,
    })
  })

  it('numbers its parcels apart from standard ones', () => {
    const desk = openDesk()
    desk.ship(orderOf(800), 'standard')

    expect(desk.ship(orderOf(800), 'express').trackingNumber).toBe('EXP-0001')
  })

  it('refuses parcels over 10 kg', () => {
    expect(() => openDesk().ship(orderOf(10_001), 'express')).toThrow('Too heavy for express shipping')
  })

  it('does not use up a tracking number on a refused parcel', () => {
    const desk = openDesk()
    expect(() => desk.ship(orderOf(10_001), 'express')).toThrow()

    expect(desk.ship(orderOf(800), 'express').trackingNumber).toBe('EXP-0001')
  })
})

describe('shipping desk', () => {
  it('refuses to ship an empty order', () => {
    const empty = { customer: { name: 'Ada', tier: 'regular' as const }, lines: [] }

    expect(() => openDesk().ship(empty, 'standard')).toThrow('Cannot ship an empty order')
  })
})
