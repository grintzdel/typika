import { describe, expect, it } from 'vitest'
import { CARRIER_NAMES } from '../src/shipping/carrier-name.ts'
import { ShippingDesk } from '../src/shipping/shipping-desk.ts'
import { SequentialTrackingNumbers } from '../src/shipping/tracking-numbers.ts'
import { orderOf } from './order-fixture.ts'

const openDesk = () => new ShippingDesk(new SequentialTrackingNumbers())

describe('locker shipping', () => {
  it('is offered next to the other carriers', () => {
    expect(CARRIER_NAMES).toContain('locker')
  })

  it('ships a parcel to collect from a locker, delivered in 2 days', () => {
    expect(openDesk().ship(orderOf(800), 'locker')).toEqual({
      trackingNumber: 'LCK-0001',
      label: 'LOCKER LCK-0001 for Ada, collect within 7 days',
      deliveryDays: 2,
    })
  })

  it('takes parcels too heavy for express', () => {
    expect(openDesk().ship(orderOf(15_000), 'locker').trackingNumber).toBe('LCK-0001')
  })

  it('refuses parcels over 20 kg', () => {
    expect(() => openDesk().ship(orderOf(20_001), 'locker')).toThrow('Too heavy for a locker')
  })

  it('does not use up a tracking number on a refused parcel', () => {
    const desk = openDesk()
    expect(() => desk.ship(orderOf(20_001), 'locker')).toThrow()

    expect(desk.ship(orderOf(800), 'locker').trackingNumber).toBe('LCK-0001')
  })
})
