package catalog

import shop.Money

class DigitalProduct(sku: Sku, name: String, price: Money, private val downloadUrl: String) :
    PhysicalProduct(sku, name, price, weightInGrams = 0) {
    override fun ship(address: String): Parcel =
        throw UnsupportedOperationException("$sku is digital and cannot be shipped")

    fun downloadLink() = downloadUrl
}
