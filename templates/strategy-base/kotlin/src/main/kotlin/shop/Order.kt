package shop

enum class Tier { REGULAR, MEMBER }

data class Customer(val name: String, val tier: Tier)

data class OrderLine(val sku: String, val unitPrice: Money, val quantity: Int, val unitWeightGrams: Int)

data class Order(val customer: Customer, val lines: List<OrderLine>) {
    val subtotal: Money
        get() = lines.fold(Money.ZERO) { sum, line -> sum + line.unitPrice * line.quantity }

    val weightGrams: Int
        get() = lines.sumOf { it.unitWeightGrams * it.quantity }
}
