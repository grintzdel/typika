package typika.compiler

import java.io.File
import kotlin.system.exitProcess

fun main() {
    val config = Config.fromEnvironment()
    val output = File(checkNotNull(config.aotCache) { "KOTLIN_COMPILER_AOT_CACHE is not set" })
    val process = ProcessBuilder(workerCommand(config, listOf("-XX:AOTCacheOutput=${output.path}")))
        .redirectInput(ProcessBuilder.Redirect.from(File("/dev/null")))
        .redirectOutput(ProcessBuilder.Redirect.DISCARD)
        .redirectError(ProcessBuilder.Redirect.INHERIT)
        .start()
    val exit = process.waitFor()
    if (exit != 0 || !output.isFile) {
        System.err.println("AOT training failed with exit code $exit")
        exitProcess(1)
    }
}
