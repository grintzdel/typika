// #region tour:around
export const withLogging = (notify, logger) => (recipient, message) => {
  try {
    notify(recipient, message)
  } catch (error) {
    logger.info(`failed to notify ${recipient}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
  logger.info(`notified ${recipient}`)
}
// #endregion
