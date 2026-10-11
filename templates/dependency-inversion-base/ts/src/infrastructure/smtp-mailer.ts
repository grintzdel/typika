export class SmtpMailer {
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
