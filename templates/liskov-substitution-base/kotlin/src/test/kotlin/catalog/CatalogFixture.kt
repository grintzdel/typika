package catalog

import shop.eur

const val ADDRESS = "12 rue des Lilas, Lyon"

fun mug() = PhysicalProduct("MUG-01", "Ceramic mug", eur(1200), weightInGrams = 350)

fun tea() = PhysicalProduct("TEA-GREEN", "Green tea", eur(850), weightInGrams = 100)

fun kettle() = PhysicalProduct("KETTLE-01", "Kettle", eur(5990), weightInGrams = 1200)

fun handbook() = DigitalProduct("EBOOK-TEA", "The tea handbook", eur(990), "https://shop.example/d/EBOOK-TEA")

fun teaSet() = ProductBundle("TEA-SET", "Tea set", eur(1800), listOf(mug(), tea()))
