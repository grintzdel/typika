package typika.compiler

data class Config(
    val port: Int,
    val allowedOrigin: String?,
    val maxBodyBytes: Int,
    val timeoutMs: Long,
    val concurrency: Int,
    val queueMax: Int,
    val cacheBytes: Long,
    val workerJavaOptions: List<String>,
    val aotCache: String?,
) {
    companion object {
        fun fromEnvironment(env: Map<String, String> = System.getenv()): Config {
            fun int(name: String, default: Int) = env[name]?.toIntOrNull() ?: default
            return Config(
                port = int("PORT", 8080),
                allowedOrigin = env["KOTLIN_COMPILER_ALLOWED_ORIGIN"]?.takeIf { it.isNotBlank() },
                maxBodyBytes = int("KOTLIN_COMPILER_MAX_BODY_KB", 256) * 1024,
                timeoutMs = int("KOTLIN_COMPILER_TIMEOUT_MS", 15_000).toLong(),
                concurrency = int("KOTLIN_COMPILER_CONCURRENCY", 2).coerceAtLeast(1),
                queueMax = int("KOTLIN_COMPILER_QUEUE_MAX", 20).coerceAtLeast(0),
                cacheBytes = int("KOTLIN_COMPILER_CACHE_MB", 32).toLong() * 1024 * 1024,
                workerJavaOptions = (env["KOTLIN_COMPILER_WORKER_JAVA_OPTS"]?.takeIf { it.isNotBlank() }
                    ?: DEFAULT_WORKER_JAVA_OPTS).split(' ').filter { it.isNotBlank() },
                aotCache = env["KOTLIN_COMPILER_AOT_CACHE"]?.takeIf { it.isNotBlank() },
            )
        }

        const val DEFAULT_WORKER_JAVA_OPTS = "-Xmx192m -Xss8m -XX:ReservedCodeCacheSize=48m -XX:TieredStopAtLevel=1 " +
            "-XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -XX:-UsePerfData"
    }
}
