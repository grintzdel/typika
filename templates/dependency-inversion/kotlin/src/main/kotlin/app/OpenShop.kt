package app

import checkout.CheckoutService
import infrastructure.InMemoryOrderStore
import infrastructure.SmtpMailer

class Shop(val checkout: CheckoutService)

// #region tour:composition-root
fun openShop() = Shop(
    checkout = CheckoutService(
        orders = InMemoryOrderStore(),
        notifier = SmtpMailer("smtp.shop.example", 587),
    ),
)
// #endregion
