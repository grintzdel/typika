package typika.compiler

import java.security.MessageDigest

class ArtifactCache(private val maxBytes: Long) {
    private val entries = LinkedHashMap<String, ByteArray>(16, 0.75f, true)
    private var bytes = 0L

    @Synchronized
    fun get(key: String): ByteArray? = entries[key]

    @Synchronized
    fun put(key: String, value: ByteArray) {
        if (value.size > maxBytes) return
        entries.put(key, value)?.let { bytes -= it.size }
        bytes += value.size
        val iterator = entries.entries.iterator()
        while (bytes > maxBytes && iterator.hasNext()) {
            bytes -= iterator.next().value.size
            iterator.remove()
        }
    }
}

fun cacheKey(request: CompileRequest): String {
    val digest = MessageDigest.getInstance("SHA-256")
    fun field(value: String) {
        val bytes = value.encodeToByteArray()
        digest.update(bytes.size.toString().encodeToByteArray())
        digest.update(':'.code.toByte())
        digest.update(bytes)
    }
    field(request.protocol.toString())
    field(request.target)
    field(request.kotlinVersion)
    field(request.mode)
    for (file in request.files.sortedBy { it.path }) {
        field(file.path)
        field(file.content)
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}
