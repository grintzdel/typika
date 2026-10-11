export interface SmsGateway {
  sendSms(phoneNumber: string, text: string): void
}
