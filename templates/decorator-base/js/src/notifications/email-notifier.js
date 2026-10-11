export const emailNotifier = (mailer, { maxAttempts = 1, logger, throttle } = {}) => {
  const lastSentAt = new Map()

  return (recipient, message) => {
    if (throttle) {
      const last = lastSentAt.get(recipient)
      if (last !== undefined && throttle.clock.now() - last < throttle.intervalMs) return
    }

    for (let attempt = 1; ; attempt += 1) {
      try {
        mailer.send(recipient, message)
        break
      } catch (error) {
        if (attempt >= maxAttempts) {
          logger?.info(`failed to notify ${recipient}: ${error instanceof Error ? error.message : String(error)}`)
          throw error
        }
      }
    }

    logger?.info(`notified ${recipient}`)
    if (throttle) lastSentAt.set(recipient, throttle.clock.now())
  }
}
