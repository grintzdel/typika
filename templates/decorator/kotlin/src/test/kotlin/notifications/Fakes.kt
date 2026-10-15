package notifications

data class Sent(val to: String, val body: String)

class FailingMailer(private val failures: Int) : Mailer {
    val attempts = mutableListOf<Sent>()

    override fun send(to: String, body: String) {
        attempts += Sent(to, body)
        if (attempts.size <= failures) throw IllegalStateException("SMTP timeout")
    }
}

class RecordingLogger : Logger {
    val lines = mutableListOf<String>()

    override fun info(line: String) {
        lines += line
    }
}

class FakeClock : Clock {
    private var current = 0L

    override fun now() = current

    fun advance(ms: Long) {
        current += ms
    }
}
