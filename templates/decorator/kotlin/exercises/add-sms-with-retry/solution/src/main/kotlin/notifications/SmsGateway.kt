package notifications

fun interface SmsGateway {
    fun sendSms(phoneNumber: String, text: String)
}
