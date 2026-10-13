package catalog

import shop.Money

class PhysicalProduct(
    override val sku: Sku,
    override val name: String,
    override val price: Money,
    override val weightInGrams: Int,
) : Product, Shippable {
    override fun ship(address: String) = Parcel(sku, address, weightInGrams)
}
