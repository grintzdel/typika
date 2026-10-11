import type { Notifier } from '../checkout/notifier.ts'

export class SmtpMailer implements Notifier {
  private readonly host: string
  private readonly port: number

  constructor(host: string, port: number) {
    this.host = host
    this.port = port
  }

  notify(recipient: string, message: string): void {
    console.log(`SMTP ${this.host}:${this.port} -> ${recipient}: ${message}`)
  }
}
