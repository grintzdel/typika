export interface Mailer {
  send(to: string, body: string): void
}
