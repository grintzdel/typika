export type Email = {
  readonly to: string
  readonly subject: string
  readonly body: string
}

export class SmtpMailer {
  readonly sent: Email[] = []
  private readonly host: string

  constructor(host: string) {
    this.host = host
  }

  send(email: Email): void {
    this.sent.push(email)
    console.log(`SMTP ${this.host} -> ${email.to}: ${email.subject}`)
  }
}
