import app.ShopServices
import app.openShop
import payments.GiftCards
import payments.PaymentMethod
import shop.Ledger
import shop.eur

fun main() {
    val ledger = Ledger()
    var giftCardRedemptions = 0
    val shop = openShop(ShopServices(ledger, GiftCards { "gift-${++giftCardRedemptions}" }))

    shop.checkout.pay(PaymentMethod.CARD, eur(5990))
    val transfer = shop.checkout.pay(PaymentMethod.BANK_TRANSFER, eur(3250))
    shop.refunds.refund(transfer)
    val card = shop.wallet.saveCard("grace@example.com", "4242424242424242")
    shop.teaClub.join(card)

    ledger.entries.forEach(::println)
}
