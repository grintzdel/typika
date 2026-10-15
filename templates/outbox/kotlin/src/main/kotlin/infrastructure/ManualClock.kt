package infrastructure

import kotlin.time.Duration.Companion.days
import kotlin.time.Instant

class ManualClock(start: String) {
    private var current = Instant.parse(start)

    fun now() = current

    fun advanceDays(days: Int) {
        current += days.days
    }
}
