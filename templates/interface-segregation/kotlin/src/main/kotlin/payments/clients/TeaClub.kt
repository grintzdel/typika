package payments.clients

import payments.CardToken
import payments.RecurringPayments
import shop.eur

private val TEA_CLUB_MONTHLY_FEE = eur(990)

class TeaClub(private val payments: RecurringPayments) {
    fun join(card: CardToken) {
        payments.subscribe(card, TEA_CLUB_MONTHLY_FEE)
    }
}
