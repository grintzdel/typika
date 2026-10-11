export interface Notifier {
  notify(recipient: string, message: string): void
}
