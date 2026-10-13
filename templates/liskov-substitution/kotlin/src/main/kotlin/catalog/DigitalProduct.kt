package catalog

import shop.Money

class DigitalProduct(
    override val sku: Sku,
    override val name: String,
    override val price: Money,
    private val downloadUrl: String,
) : Product, Downloadable {
    override fun downloadLink() = downloadUrl
}
