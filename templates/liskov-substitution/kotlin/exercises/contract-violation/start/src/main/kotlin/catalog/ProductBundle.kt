package catalog

import shop.Money

private const val BOX_WEIGHT_IN_GRAMS = 300

class ProductBundle(
    override val sku: Sku,
    override val name: String,
    override val price: Money,
    val items: List<Shippable>,
) : Product, Shippable {
    override val weightInGrams: Int
        get() = items.sumOf { it.weightInGrams }

    override fun ship(address: String) = Parcel(sku, address, weightInGrams + BOX_WEIGHT_IN_GRAMS)
}
