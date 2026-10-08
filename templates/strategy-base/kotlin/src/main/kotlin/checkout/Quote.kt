package checkout

import shop.Money

data class Quote(val subtotal: Money, val shipping: Money, val total: Money)
