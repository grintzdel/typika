A decorator only sees the calls made to it. To log the outcome of all the attempts together, `withLogging` has to wrap
the function that `withRetry` returns, not the other way round.
