import { CheckoutService } from './checkout/checkout-service.ts'

export const openShop = () => ({
  checkout: new CheckoutService(),
})
