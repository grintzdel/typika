import type { Notifier } from './notifier.ts'
import type { SmsGateway } from './sms-gateway.ts'

export class SmsNotifier implements Notifier {
  private readonly sms: SmsGateway

  constructor(sms: SmsGateway) {
    this.sms = sms
  }

  notify(recipient: string, message: string): void {
    this.sms.sendSms(recipient, message)
  }
}
