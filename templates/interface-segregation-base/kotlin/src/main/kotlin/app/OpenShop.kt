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

fun openShop(services: ShopServices): Shop {
    val card = CardGateway(services.ledger)
    val bankTransfer = BankTransferGateway(services.ledger)
    val gateways = mapOf(PaymentMethod.CARD to card, PaymentMethod.BANK_TRANSFER to bankTransfer)

    return Shop(
        checkout = Checkout(gateways),
        refunds = Refunds(gateways),
        wallet = Wallet(card),
        teaClub = TeaClub(card),
    )
}
