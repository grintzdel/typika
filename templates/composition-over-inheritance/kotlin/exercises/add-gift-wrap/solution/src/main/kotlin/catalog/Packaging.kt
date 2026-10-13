package catalog

import shop.Money
import shop.eur

interface Packaging {
    val packaging: List<String>
    val packagingFee: Money get() = Money.ZERO
}

object NoPackaging : Packaging {
    override val packaging = emptyList<String>()
}

object CardboardBox : Packaging {
    override val packaging = listOf("cardboard box")
}

object InsulatedBox : Packaging {
    override val packaging = listOf("insulated box")
}

private val GIFT_WRAP_FEE = eur(350)

class GiftWrapped(inner: Packaging) : Packaging {
    override val packaging = inner.packaging + "gift wrap"
    override val packagingFee = inner.packagingFee + GIFT_WRAP_FEE
}
