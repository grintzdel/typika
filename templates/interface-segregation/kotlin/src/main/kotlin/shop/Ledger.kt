package shop

class Ledger {
    private val recorded = mutableListOf<String>()

    val entries: List<String>
        get() = recorded.toList()

    fun record(entry: String) {
        recorded += entry
    }
}
