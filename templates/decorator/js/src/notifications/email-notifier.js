export const emailNotifier = (mailer) => (recipient, message) => mailer.send(recipient, message)
