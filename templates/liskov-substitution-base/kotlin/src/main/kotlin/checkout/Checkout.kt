package checkout

import catalog.DigitalProduct
import catalog.Parcel
import catalog.PhysicalProduct
import shop.Money
import shop.eur

data class CheckoutResult(val total: Money, val shipping: Money, val parcels: List<Parcel>, val downloads: List<String>)

private const val LIGHT_PARCEL_MAX_GRAMS = 2000
private val LIGHT_PARCEL_FEE = eur(490)
private val HEAVY_PARCEL_FEE = eur(990)

fun checkout(products: List<PhysicalProduct>, address: String): CheckoutResult {
    val parcels = mutableListOf<Parcel>()
    val downloads = mutableListOf<String>()
    var weight = 0

    for (product in products) {
        if (product is DigitalProduct) {
            downloads += product.downloadLink()
            continue
        }
        weight += product.weightInGrams
        parcels += product.ship(address)
    }

    val shipping = when {
        parcels.isEmpty() -> Money.ZERO
        weight <= LIGHT_PARCEL_MAX_GRAMS -> LIGHT_PARCEL_FEE
        else -> HEAVY_PARCEL_FEE
    }
    val total = products.fold(shipping) { sum, product -> sum + product.price }

    return CheckoutResult(total, shipping, parcels, downloads)
}
