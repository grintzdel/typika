import catalog.CATALOG

fun main() {
    for (product in CATALOG) {
        val packaging = product.packaging.joinToString(" + ").ifEmpty { "no packaging" }
        println("${product.name.padEnd(40)} ${product.price().toString().padStart(10)}")
        println("  shipping: ${product.shippingMethod.name.lowercase()}, packaging: $packaging")
    }
}
