import type { CardToken } from '../payment.ts'
import type { CardVault } from '../capabilities.ts'

export class Wallet {
  private readonly vault: CardVault

  constructor(vault: CardVault) {
    this.vault = vault
  }

  saveCard(customerEmail: string, cardNumber: string): CardToken {
    return this.vault.saveCard(customerEmail, cardNumber)
  }
}
