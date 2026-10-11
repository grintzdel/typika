import { openShop } from './open-shop.ts'
import { Ledger } from './shop/ledger.ts'
import { money } from './shop/money.ts'

const ledger = new Ledger()
let giftCardRedemptions = 0
const shop = openShop({ ledger, giftCards: { redeem: () => `gift-${++giftCardRedemptions}` } })

shop.checkout.pay('card', money(5990))
shop.checkout.pay('gift-card', money(2500))
const transfer = shop.checkout.pay('bank-transfer', money(3250))
shop.refunds.refund(transfer)
const card = shop.wallet.saveCard('grace@example.com', '4242424242424242')
shop.teaClub.join(card)

for (const entry of ledger.entries) console.log(entry)
