package typika.compiler

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.File
import java.io.FileDescriptor
import java.io.FileOutputStream
import java.io.PrintStream

val warmUpRequest = CompileRequest(
    protocol = PROTOCOL_VERSION,
    target = Target.JS,
    kotlinVersion = KOTLIN_LANGUAGE_VERSION,
    mode = Mode.TEST,
    files = listOf(
        SourceFile(
            "src/main/kotlin/Greeting.kt",
            """
            package warmup

            data class Greeting(val name: String) {
                fun render(): String = listOf("Hello", name).joinToString(", ") + "!"
            }
            """.trimIndent(),
        ),
        SourceFile(
            "src/test/kotlin/GreetingTest.kt",
            """
            package warmup

            import kotlin.test.Test
            import kotlin.test.assertEquals

            class GreetingTest {
                @Test
                fun rendersTheName() {
                    assertEquals("Hello, Kotlin!", Greeting("Kotlin").render())
                }
            }
            """.trimIndent(),
        ),
    ),
)

fun main() {
    val channel = DataOutputStream(FileOutputStream(FileDescriptor.out).buffered())
    System.setOut(PrintStream(FileOutputStream(FileDescriptor.err), true))
    val input = DataInputStream(System.`in`.buffered())
    val compiler = KotlinJsCompiler(File(System.getenv("KOTLIN_COMPILER_WEB_LIBS") ?: "build/web-libs"))

    check(compiler.compile(warmUpRequest).ok) { "warm-up compilation failed" }
    channel.writeFrame(ByteArray(0))

    while (true) {
        val payload = try {
            input.readFrame()
        } catch (_: EOFException) {
            return
        }
        val request = json.decodeFromString<CompileRequest>(payload.decodeToString())
        channel.writeFrame(json.encodeToString(compiler.compile(request)).encodeToByteArray())
    }
}

fun DataOutputStream.writeFrame(bytes: ByteArray) {
    writeInt(bytes.size)
    write(bytes)
    flush()
}

fun DataInputStream.readFrame(): ByteArray {
    val size = readInt()
    return ByteArray(size).also { readFully(it) }
}
