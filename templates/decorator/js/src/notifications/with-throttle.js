export const withThrottle = (notify, clock, intervalMs) => {
  const lastSentAt = new Map()

  return (recipient, message) => {
    const last = lastSentAt.get(recipient)
    if (last !== undefined && clock.now() - last < intervalMs) return

    notify(recipient, message)
    lastSentAt.set(recipient, clock.now())
  }
}
