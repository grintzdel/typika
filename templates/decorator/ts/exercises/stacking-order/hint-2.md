A decorator only sees the calls made to it. To log the outcome of all the attempts together, `LoggingNotifier` has to
wrap `RetryingNotifier`, not the other way round.
