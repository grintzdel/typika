import { Checkout } from './payments/clients/checkout.ts'
import { Refunds } from './payments/clients/refunds.ts'
import { TeaClub } from './payments/clients/tea-club.ts'
import { Wallet } from './payments/clients/wallet.ts'
import { BankTransferGateway } from './payments/gateways/bank-transfer-gateway.ts'
import { CardGateway } from './payments/gateways/card-gateway.ts'
import type { Ledger } from './shop/ledger.ts'

export type ShopServices = {
  readonly ledger: Ledger
}

export const openShop = ({ ledger }: ShopServices) => {
  const card = new CardGateway(ledger)
  const bankTransfer = new BankTransferGateway(ledger)
  const gateways = { card, 'bank-transfer': bankTransfer }

  return {
    checkout: new Checkout(gateways),
    refunds: new Refunds(gateways),
    wallet: new Wallet(card),
    teaClub: new TeaClub(card),
  }
}
