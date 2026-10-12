A decorator only sees the calls made to it. To log the outcome of all the attempts together, `Logging` has to wrap
`Retrying`, not the other way round.
