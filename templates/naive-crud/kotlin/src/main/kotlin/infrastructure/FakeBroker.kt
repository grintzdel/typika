package infrastructure

data class Message(val topic: String, val payload: Map<String, Any?>)

class FakeBroker {
    private val messages = mutableListOf<Message>()
    private var available = true

    val published: List<Message>
        get() = messages

    fun goDown() {
        available = false
    }

    fun comeBack() {
        available = true
    }

    fun publish(topic: String, payload: Map<String, Any?>) {
        check(available) { "Broker unavailable, $topic not published" }
        messages += Message(topic, payload)
        println("broker <- $topic $payload")
    }
}
