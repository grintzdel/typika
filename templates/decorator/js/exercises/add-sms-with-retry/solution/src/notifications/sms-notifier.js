export const smsNotifier = (sms) => (recipient, message) => sms.sendSms(recipient, message)
