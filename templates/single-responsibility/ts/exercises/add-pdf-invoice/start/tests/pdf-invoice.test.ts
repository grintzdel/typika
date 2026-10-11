import { describe, expect, it } from 'vitest'
import { OrderService } from '../src/orders/order-service.ts'
import { money } from '../src/shop/money.ts'
import { ada, grace, orderOf } from './order-fixture.ts'
import { fakeServices } from './services-fixture.ts'

describe('PDF invoice', () => {
  it('writes the invoice of a placed order as a PDF', () => {
    const services = fakeServices()
    const orderService = new OrderService(services)
    orderService.placeOrder({
      customer: ada,
      lines: [
        { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
        { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
      ],
    })

    const file = orderService.downloadInvoice('order-1')

    expect(services.pdf.write).toHaveBeenCalledWith({
      title: 'Invoice order-1',
      rows: [
        { label: '2 x MUG-01', amount: '24.00 EUR' },
        { label: '1 x TEA-GREEN', amount: '8.50 EUR' },
        { label: 'Shipping', amount: '4.90 EUR' },
      ],
      total: '37.40 EUR',
    })
    expect(file).toEqual(new Uint8Array([37, 80, 68, 70]))
  })

  it('shows the member discount and free shipping', () => {
    const services = fakeServices()
    const orderService = new OrderService(services)
    orderService.placeOrder(orderOf(grace, 5990))

    orderService.downloadInvoice('order-1')

    expect(services.pdf.write).toHaveBeenCalledWith({
      title: 'Invoice order-1',
      rows: [
        { label: '1 x TEST-SKU', amount: '59.90 EUR' },
        { label: 'Member discount', amount: '-5.99 EUR' },
        { label: 'Shipping', amount: '0.00 EUR' },
      ],
      total: '53.91 EUR',
    })
  })

  it('writes the invoice of the requested order', () => {
    const services = fakeServices()
    const orderService = new OrderService(services)
    orderService.placeOrder(orderOf(ada, 1000))
    orderService.placeOrder(orderOf(grace, 2000))

    orderService.downloadInvoice('order-2')

    expect(services.pdf.write).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invoice order-2', total: '22.90 EUR' }))
  })

  it('refuses an unknown order', () => {
    const services = fakeServices()
    const orderService = new OrderService(services)

    expect(() => orderService.downloadInvoice('order-9')).toThrow('Unknown order order-9')
    expect(services.pdf.write).not.toHaveBeenCalled()
  })

  it('keeps emailing the text invoice', () => {
    const services = fakeServices()

    new OrderService(services).placeOrder(orderOf(grace, 5990))

    expect(services.notifier.notify).toHaveBeenCalledWith('grace@example.com', expect.stringContaining('Total: 53.91 EUR'))
  })
})
