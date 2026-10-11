import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, grace, orderOf } from './order-fixture.ts'
import { fakeServices } from './services-fixture.ts'

describe('loyalty campaign', () => {
  it('awards members one point per full euro while a campaign runs', () => {
    const services = fakeServices()
    const shop = openShop(services)

    shop.startLoyaltyCampaign()
    shop.placeOrder(orderOf(grace, 5990))

    expect(services.loyalty.award).toHaveBeenCalledWith('grace@example.com', 59)
  })

  it('awards no points to regular customers', () => {
    const services = fakeServices()
    const shop = openShop(services)

    shop.startLoyaltyCampaign()
    shop.placeOrder(orderOf(ada, 5990))

    expect(services.loyalty.award).not.toHaveBeenCalled()
  })

  it('awards no points before a campaign starts', () => {
    const services = fakeServices()

    openShop(services).placeOrder(orderOf(grace, 5990))

    expect(services.loyalty.award).not.toHaveBeenCalled()
  })

  it('stops awarding points once the campaign ends', () => {
    const services = fakeServices()
    const shop = openShop(services)

    const endCampaign = shop.startLoyaltyCampaign()
    shop.placeOrder(orderOf(grace, 2000))
    endCampaign()
    shop.placeOrder(orderOf(grace, 3000))

    expect(services.loyalty.award).toHaveBeenCalledTimes(1)
    expect(services.loyalty.award).toHaveBeenCalledWith('grace@example.com', 20)
  })

  it('keeps confirming orders while a campaign runs', () => {
    const services = fakeServices()
    const shop = openShop(services)

    shop.startLoyaltyCampaign()
    shop.placeOrder(orderOf(grace, 5990))

    expect(services.notifier.notify).toHaveBeenCalledWith('grace@example.com', 'Order order-1 confirmed: 59.90 EUR')
  })
})
