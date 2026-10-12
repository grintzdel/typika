+++
id = "flag-soup"
title = "One type, one option per job"
+++

Before the pattern, `Email` did every job itself, each one switched on by an option:

```go
type EmailOptions struct {
	MaxAttempts int
	Logger      Logger
	Throttle    *Throttle
}
```

Its `Notify` method reads all three options and interleaves them: check the throttle, loop over the attempts, log the
failure inside the loop, log the success after it, record the send time at the end. Every new behaviour adds a field
and a few lines in the middle of the others, plus a `nil` check.

The jobs are also stuck to email. Texts need the same retry and the same log: the only way to reuse them is to copy
the loop into a second type.

Open **Diff from base** to see the full before and after.
