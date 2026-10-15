package payments.clients

import payments.CardToken
import payments.PaymentGateway
import shop.eur

private val TEA_CLUB_MONTHLY_FEE = eur(990)

class TeaClub(private val gateway: PaymentGateway) {
    fun join(card: CardToken) {
        gateway.subscribe(card, TEA_CLUB_MONTHLY_FEE)
    }
}
