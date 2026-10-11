import { CheckoutService } from './checkout/checkout-service.ts'
import { InMemoryOrderStore } from './infrastructure/in-memory-order-store.ts'
import { SmtpMailer } from './infrastructure/smtp-mailer.ts'

// #region tour:composition-root
export const openShop = () => ({
  checkout: new CheckoutService({
    orders: new InMemoryOrderStore(),
    notifier: new SmtpMailer('smtp.shop.example', 587),
  }),
})
// #endregion
