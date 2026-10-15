package notifications

class SmsNotifier(private val sms: SmsGateway) : Notifier {
    override fun notify(recipient: String, message: String) {
        sms.sendSms(recipient, message)
    }
}
