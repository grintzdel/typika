package typika.compiler

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.nio.file.Files
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicInteger

sealed interface WorkerResult {
    data class Done(val response: ByteArray) : WorkerResult
    data object TimedOut : WorkerResult
    data object Crashed : WorkerResult
}

private class WorkerProcess(val process: Process, private val tmpDir: File) {
    private val input = DataInputStream(process.inputStream.buffered())
    private val output = DataOutputStream(process.outputStream.buffered())

    fun awaitReady() {
        input.readFrame()
    }

    fun exchange(payload: ByteArray): ByteArray {
        output.writeFrame(payload)
        return input.readFrame()
    }

    fun kill() {
        process.destroyForcibly().waitFor(5, TimeUnit.SECONDS)
        tmpDir.deleteRecursively()
    }
}

class WorkerPool(private val config: Config) {
    private val idle = LinkedBlockingQueue<WorkerProcess>()
    private val executor = Executors.newVirtualThreadPerTaskExecutor()
    private val ready = AtomicInteger()

    val readyWorkers: Int get() = ready.get()

    fun start() {
        repeat(config.concurrency) { spawn() }
    }

    fun compile(payload: ByteArray): WorkerResult {
        val worker = idle.take()
        val exchange = executor.submit<ByteArray> { worker.exchange(payload) }
        return try {
            val response = exchange.get(config.timeoutMs, TimeUnit.MILLISECONDS)
            idle.put(worker)
            WorkerResult.Done(response)
        } catch (_: TimeoutException) {
            replace(worker)
            WorkerResult.TimedOut
        } catch (_: ExecutionException) {
            replace(worker)
            WorkerResult.Crashed
        }
    }

    private fun replace(worker: WorkerProcess) {
        ready.decrementAndGet()
        worker.kill()
        spawn()
    }

    private fun spawn() {
        executor.submit {
            while (true) {
                val worker = launch()
                try {
                    worker.awaitReady()
                    ready.incrementAndGet()
                    idle.put(worker)
                    return@submit
                } catch (e: Exception) {
                    worker.kill()
                    System.err.println("worker failed to start: ${e.javaClass.simpleName}")
                    Thread.sleep(1_000)
                }
            }
        }
    }

    private fun launch(): WorkerProcess {
        val tmpDir = Files.createTempDirectory("worker").toFile()
        val options = listOfNotNull(config.aotCache?.let { "-XX:AOTCache=$it" }, "-Djava.io.tmpdir=${tmpDir.path}")
        val process = ProcessBuilder(workerCommand(config, options))
            .redirectError(ProcessBuilder.Redirect.INHERIT)
            .also { it.environment().remove("JAVA_TOOL_OPTIONS") }
            .start()
        return WorkerProcess(process, tmpDir)
    }
}

fun workerCommand(config: Config, extraOptions: List<String>): List<String> {
    val java = ProcessHandle.current().info().command().orElse("java")
    val logsOnStderr = listOf("-Xlog:disable", "-Xlog:all=warning,aot*=error:stderr")
    val main = listOf("-cp", System.getProperty("java.class.path"), "typika.compiler.WorkerKt")
    return listOf(java) + logsOnStderr + extraOptions + config.workerJavaOptions + main
}
