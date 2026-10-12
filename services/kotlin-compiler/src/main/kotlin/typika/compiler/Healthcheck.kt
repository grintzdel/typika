package typika.compiler

import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import kotlin.system.exitProcess

fun main() {
    val port = System.getenv("PORT") ?: "8080"
    val status = try {
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI("http://127.0.0.1:$port/health")).timeout(Duration.ofSeconds(3)).build(),
                HttpResponse.BodyHandlers.discarding(),
            )
            .statusCode()
    } catch (_: Exception) {
        0
    }
    exitProcess(if (status == 200) 0 else 1)
}
