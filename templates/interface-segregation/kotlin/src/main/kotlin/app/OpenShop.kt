package app

import payments.PaymentMethod
import payments.clients.Checkout
import payments.clients.Refunds
import payments.clients.TeaClub
import payments.clients.Wallet
import payments.gateways.BankTransferGateway
import payments.gateways.CardGateway
import shop.Ledger

data class ShopServices(val ledger: Ledger)

class Shop(val checkout: Checkout, val refunds: Refunds, val wallet: Wallet, val teaClub: TeaClub)

// #region tour:compose
fun openShop(services: ShopServices): Shop {
    val card = CardGateway(services.ledger)
    val bankTransfer = BankTransferGateway(services.ledger)

    return Shop(
        checkout = Checkout(mapOf(PaymentMethod.CARD to card, PaymentMethod.BANK_TRANSFER to bankTransfer)),
        refunds = Refunds(mapOf(PaymentMethod.CARD to card, PaymentMethod.BANK_TRANSFER to bankTransfer)),
        wallet = Wallet(card),
        teaClub = TeaClub(card),
    )
}
// #endregion
