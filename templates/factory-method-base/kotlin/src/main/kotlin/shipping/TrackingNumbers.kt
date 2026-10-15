package shipping

interface TrackingNumbers {
    fun next(prefix: String): String
}

class SequentialTrackingNumbers : TrackingNumbers {
    private val counters = mutableMapOf<String, Int>()

    override fun next(prefix: String): String {
        val count = (counters[prefix] ?: 0) + 1
        counters[prefix] = count
        return "$prefix-${count.toString().padStart(4, '0')}"
    }
}
