package web

typealias Json = Map<String, Any?>

enum class Method { GET, POST }

data class HttpRequest(val method: Method, val path: String, val body: Json = emptyMap())

data class HttpResponse(val status: Int, val body: Json)

// On Kotlin/JS every number is a JavaScript number, and `0.5 as? Int` succeeds.
fun Map<*, *>.wholeNumber(key: String): Int? {
    val number = this[key] as? Number ?: return null
    return number.toInt().takeIf { it.toDouble() == number.toDouble() }
}
