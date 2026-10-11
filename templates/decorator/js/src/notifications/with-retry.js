// #region tour:decorator
export const withRetry = (notify, maxAttempts) => (recipient, message) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      notify(recipient, message)
      return
    } catch (error) {
      if (attempt >= maxAttempts) throw error
    }
  }
}
// #endregion
