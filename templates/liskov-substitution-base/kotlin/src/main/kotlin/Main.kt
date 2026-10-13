import catalog.DigitalProduct
import catalog.PhysicalProduct
import catalog.ProductBundle
import checkout.checkout
import shop.eur

private val mug = PhysicalProduct("MUG-01", "Ceramic mug", eur(1200), weightInGrams = 350)
private val tea = PhysicalProduct("TEA-GREEN", "Green tea", eur(850), weightInGrams = 100)
private val handbook = DigitalProduct("EBOOK-TEA", "The tea handbook", eur(990), "https://shop.example/d/EBOOK-TEA")
private val teaSet = ProductBundle("TEA-SET", "Tea set", eur(1800), listOf(mug, tea))

fun main() {
    val result = checkout(listOf(teaSet, mug, handbook), "12 rue des Lilas, Lyon")

    for (parcel in result.parcels) println("parcel    ${parcel.sku}, ${parcel.weightInGrams} g, to ${parcel.address}")
    for (link in result.downloads) println("download  $link")
    println("shipping  ${result.shipping}")
    println("total     ${result.total}")
}
