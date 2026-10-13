package checkout

import catalog.Downloadable
import catalog.Parcel
import catalog.Product
import catalog.Shippable
import shop.Money
import shop.eur

data class CheckoutResult(val total: Money, val shipping: Money, val parcels: List<Parcel>, val downloads: List<String>)

private const val LIGHT_PARCEL_MAX_GRAMS = 2000
private val LIGHT_PARCEL_FEE = eur(490)
private val HEAVY_PARCEL_FEE = eur(990)

fun checkout(products: List<Product>, address: String): CheckoutResult {
    val shippables = products.filterIsInstance<Shippable>()
    val weight = shippables.sumOf { it.weightInGrams }

    val shipping = when {
        shippables.isEmpty() -> Money.ZERO
        weight <= LIGHT_PARCEL_MAX_GRAMS -> LIGHT_PARCEL_FEE
        else -> HEAVY_PARCEL_FEE
    }

    return CheckoutResult(
        total = products.fold(shipping) { sum, product -> sum + product.price },
        shipping = shipping,
        parcels = shippables.map { it.ship(address) },
        downloads = products.filterIsInstance<Downloadable>().map { it.downloadLink() },
    )
}
