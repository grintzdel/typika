package typika.compiler

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

class CompileService(private val config: Config, private val pool: WorkerPool) {
    private val cache = ArtifactCache(config.cacheBytes)
    private val inFlight = AtomicInteger()

    fun handleCompile(exchange: HttpExchange) {
        val started = System.nanoTime()
        val log = RequestLog()
        try {
            if (exchange.requestMethod == "OPTIONS") return exchange.preflight()
            if (exchange.requestMethod != "POST") return exchange.reply(405, error("method not allowed"))
            val body = exchange.readBody(config.maxBodyBytes)
                ?: return exchange.reply(413, error("request body over ${config.maxBodyBytes / 1024} KiB"))
            log.bytes = body.size
            val request = try {
                parseCompileRequest(body.decodeToString())
            } catch (e: InvalidRequest) {
                return exchange.reply(400, error(e.message ?: "invalid request"))
            }
            val key = cacheKey(request)
            log.hash = key.take(12)
            log.files = request.files.size
            cache.get(key)?.let {
                log.cache = "hit"
                return exchange.reply(200, it)
            }
            if (inFlight.incrementAndGet() > config.concurrency + config.queueMax) {
                inFlight.decrementAndGet()
                exchange.responseHeaders.add("Retry-After", "5")
                return exchange.reply(503, error("compilation queue is full"))
            }
            val result = try {
                pool.compile(json.encodeToString(request).encodeToByteArray())
            } finally {
                inFlight.decrementAndGet()
            }
            when (result) {
                is WorkerResult.Done -> {
                    cache.put(key, result.response)
                    exchange.reply(200, result.response)
                }
                WorkerResult.TimedOut -> exchange.reply(504, error("compilation timed out after ${config.timeoutMs} ms"))
                WorkerResult.Crashed -> exchange.reply(503, error("compiler crashed and is restarting"))
            }
        } finally {
            log.status = exchange.responseCode
            log.ms = (System.nanoTime() - started) / 1_000_000
            println(log)
            exchange.close()
        }
    }

    fun handleHealth(exchange: HttpExchange) {
        exchange.use {
            val ready = pool.readyWorkers
            val body = """{"ok":${ready > 0},"kotlinVersion":"$KOTLIN_VERSION","readyWorkers":$ready}"""
            exchange.reply(if (ready > 0) 200 else 503, body.encodeToByteArray())
        }
    }

    private fun HttpExchange.preflight() {
        val origin = requestHeaders.getFirst("Origin")
        if (config.allowedOrigin == null || origin != config.allowedOrigin) return reply(403, error("origin not allowed"))
        responseHeaders.add("Access-Control-Allow-Methods", "POST")
        responseHeaders.add("Access-Control-Allow-Headers", "content-type")
        responseHeaders.add("Access-Control-Max-Age", "600")
        withCors()
        sendResponseHeaders(204, -1)
    }

    private fun HttpExchange.withCors() {
        val origin = requestHeaders.getFirst("Origin")
        if (config.allowedOrigin != null && origin == config.allowedOrigin) {
            responseHeaders.add("Access-Control-Allow-Origin", origin)
            responseHeaders.add("Vary", "Origin")
        }
    }

    private fun HttpExchange.reply(status: Int, body: ByteArray) {
        withCors()
        responseHeaders.add("Content-Type", "application/json")
        responseHeaders.add("Cache-Control", "no-store")
        responseHeaders.add("X-Content-Type-Options", "nosniff")
        sendResponseHeaders(status, body.size.toLong())
        responseBody.use { it.write(body) }
    }
}

private class RequestLog {
    var status = 0
    var ms = 0L
    var bytes = 0
    var files = 0
    var hash = "-"
    var cache = "miss"

    override fun toString() = "compile status=$status ms=$ms bytes=$bytes files=$files hash=$hash cache=$cache"
}

private fun error(message: String) = json.encodeToString(ErrorResponse(message)).encodeToByteArray()

private fun HttpExchange.readBody(limit: Int): ByteArray? {
    val declared = requestHeaders.getFirst("Content-Length")?.toLongOrNull()
    if (declared != null && declared > limit) return null
    val bytes = requestBody.readNBytes(limit + 1)
    return bytes.takeIf { it.size <= limit }
}

fun main() {
    val config = Config.fromEnvironment()
    val pool = WorkerPool(config).apply { start() }
    val service = CompileService(config, pool)
    val server = HttpServer.create(InetSocketAddress(config.port), 0)
    server.createContext("/compile", service::handleCompile)
    server.createContext("/health", service::handleHealth)
    server.executor = Executors.newVirtualThreadPerTaskExecutor()
    server.start()
    println("kotlin-compiler $KOTLIN_VERSION listening on ${config.port}, ${config.concurrency} workers")
}
