package payments.clients

import payments.CardToken
import payments.CardVault

class Wallet(private val vault: CardVault) {
    fun saveCard(customerEmail: String, cardNumber: String): CardToken = vault.saveCard(customerEmail, cardNumber)
}
