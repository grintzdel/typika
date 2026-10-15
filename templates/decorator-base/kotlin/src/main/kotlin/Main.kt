import notifications.EmailServices
import notifications.createEmailNotifier

fun main() {
    var now = 0L
    var smtpHiccups = 1

    val notifier = createEmailNotifier(
        EmailServices(
            mailer = { to, body ->
                if (to == "grace@example.com" && smtpHiccups > 0) {
                    smtpHiccups -= 1
                    println("  smtp    timeout while sending to $to")
                    throw IllegalStateException("SMTP timeout")
                }
                println("  email   to $to: $body")
            },
            logger = { line -> println("  log     $line") },
            clock = { now },
        ),
    )

    println("Ada: order shipped")
    notifier.notify("ada@example.com", "Your order order-1 has shipped.")

    println("Ada: order delivered, ten seconds later")
    now += 10_000
    notifier.notify("ada@example.com", "Your order order-1 has been delivered.")

    println("Ada: order delivered, one minute later")
    now += 60_000
    notifier.notify("ada@example.com", "Your order order-1 has been delivered.")

    println("Grace: order shipped, through a flaky SMTP server")
    notifier.notify("grace@example.com", "Your order order-2 has shipped.")
}
