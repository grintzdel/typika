package typika.compiler

import org.jetbrains.kotlin.cli.common.ExitCode
import org.jetbrains.kotlin.cli.common.arguments.parseCommandLineArguments
import org.jetbrains.kotlin.cli.common.messages.CompilerMessageSeverity
import org.jetbrains.kotlin.cli.common.messages.CompilerMessageSourceLocation
import org.jetbrains.kotlin.cli.common.messages.MessageCollector
import org.jetbrains.kotlin.cli.js.K2JSCompiler
import org.jetbrains.kotlin.config.Services
import java.io.File
import java.nio.file.Files

private const val OUTPUT_NAME = "program"
private const val MAX_MESSAGE_LENGTH = 2_000
private val sourceMappingUrl = Regex("""\n//# sourceMappingURL=\S+\s*$""")

class KotlinJsCompiler(private val libraries: File) {
    private val libraryPath = listOf("kotlin-stdlib-js", "kotlin-test-js")
        .joinToString(File.pathSeparator) { prefix -> libraries.listFiles()!!.single { it.name.startsWith(prefix) }.path }

    fun compile(request: CompileRequest): CompileResponse {
        val work = Files.createTempDirectory("compile").toFile()
        try {
            val sources = request.files.map { file ->
                File(work, file.path).apply {
                    parentFile.mkdirs()
                    writeText(file.content)
                }
            }
            val klib = File(work, ".out/klib")
            val bin = File(work, ".out/bin")
            val common = listOf("-libraries", libraryPath, "-ir-output-name", OUTPUT_NAME)
            val firstPhase = common + listOf("-nopack", "-ir-output-dir", klib.path) + sources.map { it.path }
            val secondPhase = common + listOf(
                "-Xir-produce-js", "-Xir-dce",
                "-main", if (request.mode == Mode.TEST) "noCall" else "call",
                "-module-kind", "es", "-target", "es2015",
                "-source-map", "-source-map-base-dirs", work.path,
                "-ir-output-dir", bin.path, "-Xinclude=${klib.path}",
            )
            val diagnostics = mutableListOf<Diagnostic>()
            for (args in listOf(firstPhase, secondPhase)) {
                val collector = DiagnosticCollector(work)
                val compiler = K2JSCompiler()
                val arguments = compiler.createArguments()
                parseCommandLineArguments(args, arguments)
                val exit = compiler.exec(collector, Services.EMPTY, arguments)
                diagnostics += collector.diagnostics
                if (exit != ExitCode.OK) {
                    if (diagnostics.none { it.severity == "error" }) {
                        diagnostics += Diagnostic("error", "compilation failed (${exit.name.lowercase()})")
                    }
                    return CompileResponse(ok = false, diagnostics = diagnostics)
                }
            }
            val code = File(bin, "$OUTPUT_NAME.mjs").readText().replace(sourceMappingUrl, "\n")
            val sourceMap = File(bin, "$OUTPUT_NAME.mjs.map").readText()
            return CompileResponse(ok = true, artifact = Artifact(Target.JS, code, sourceMap), diagnostics = diagnostics)
        } finally {
            work.deleteRecursively()
        }
    }
}

private class DiagnosticCollector(private val work: File) : MessageCollector {
    val diagnostics = mutableListOf<Diagnostic>()
    private var errors = false

    override fun report(severity: CompilerMessageSeverity, message: String, location: CompilerMessageSourceLocation?) {
        val projectLocation = location?.let { toProjectLocation(it) }
        when {
            severity == CompilerMessageSeverity.EXCEPTION -> {
                errors = true
                diagnostics += Diagnostic("error", "internal compiler error: ${message.lineSequence().first().take(500)}")
            }
            severity.isError -> {
                errors = true
                diagnostics += Diagnostic("error", message.truncated(), projectLocation)
            }
            severity.isWarning && projectLocation != null -> {
                diagnostics += Diagnostic("warning", message.truncated(), projectLocation)
            }
        }
    }

    private fun toProjectLocation(location: CompilerMessageSourceLocation): Location? {
        val relative = File(location.path).absoluteFile.relativeToOrNull(work)?.invariantSeparatorsPath ?: return null
        if (relative.startsWith("..")) return null
        return Location(relative, location.line, location.column.takeIf { it > 0 })
    }

    override fun hasErrors() = errors

    override fun clear() {
        diagnostics.clear()
        errors = false
    }
}

private fun String.truncated() = if (length <= MAX_MESSAGE_LENGTH) this else take(MAX_MESSAGE_LENGTH) + "…"
