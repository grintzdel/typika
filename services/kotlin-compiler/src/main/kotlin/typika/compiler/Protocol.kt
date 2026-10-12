package typika.compiler

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

const val PROTOCOL_VERSION = 1
const val KOTLIN_VERSION = "2.4.21"
val KOTLIN_LANGUAGE_VERSION = KOTLIN_VERSION.split('.').take(2).joinToString(".")

object Target {
    const val JS = "js"
}

object Mode {
    const val RUN = "run"
    const val TEST = "test"
}

@Serializable
data class SourceFile(val path: String, val content: String)

@Serializable
data class CompileRequest(
    val protocol: Int,
    val target: String,
    val kotlinVersion: String,
    val mode: String,
    val files: List<SourceFile>,
)

@Serializable
data class Location(val file: String, val line: Int, val column: Int? = null)

@Serializable
data class Diagnostic(val severity: String, val message: String, val location: Location? = null)

@Serializable
data class Artifact(val kind: String, val code: String, val sourceMap: String)

@Serializable
data class CompileResponse(val ok: Boolean, val artifact: Artifact? = null, val diagnostics: List<Diagnostic>)

@Serializable
data class ErrorResponse(val error: String)

val json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
}
