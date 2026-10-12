package typika.compiler

const val MAX_FILES = 500

private val pathSegment = Regex("""^[A-Za-z0-9_][A-Za-z0-9_.\-]*$""")

class InvalidRequest(message: String) : Exception(message)

fun parseCompileRequest(body: String): CompileRequest {
    val request = try {
        json.decodeFromString<CompileRequest>(body)
    } catch (_: Exception) {
        throw InvalidRequest("malformed request body")
    }
    if (request.protocol != PROTOCOL_VERSION) throw InvalidRequest("unsupported protocol ${request.protocol}")
    if (request.target != Target.JS) throw InvalidRequest("unsupported target ${request.target}")
    if (request.kotlinVersion != KOTLIN_LANGUAGE_VERSION) {
        throw InvalidRequest(
            "unsupported kotlinVersion ${request.kotlinVersion}, this service compiles $KOTLIN_LANGUAGE_VERSION",
        )
    }
    if (request.mode != Mode.RUN && request.mode != Mode.TEST) throw InvalidRequest("unsupported mode ${request.mode}")
    if (request.files.isEmpty()) throw InvalidRequest("no files")
    if (request.files.size > MAX_FILES) throw InvalidRequest("more than $MAX_FILES files")
    val seen = HashSet<String>()
    for (file in request.files) {
        val segments = file.path.split('/')
        if (!file.path.endsWith(".kt") || segments.any { !pathSegment.matches(it) }) {
            throw InvalidRequest("invalid path ${file.path.take(200)}")
        }
        if (!seen.add(file.path)) throw InvalidRequest("duplicate path ${file.path}")
    }
    return request
}
