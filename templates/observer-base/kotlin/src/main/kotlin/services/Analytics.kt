package services

fun interface Analytics {
    fun track(event: String, properties: Map<String, Any>)
}
