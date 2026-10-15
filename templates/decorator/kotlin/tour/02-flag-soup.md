+++
id = "flag-soup"
title = "One class, one option per job"
+++

Before the pattern, `EmailNotifier` did every job itself, each one switched on by an optional constructor parameter:

```kotlin
class EmailNotifier(
    private val mailer: Mailer,
    private val maxAttempts: Int = 1,
    private val logger: Logger? = null,
    private val throttle: Throttle? = null,
) : Notifier
```

Named arguments and default values make this pleasant to call, which is why it is tempting in Kotlin. But `notify`
reads all three options and interleaves them: check the throttle, loop over the attempts, log the failure inside the
loop, log the success after it, record the send time at the end. Every new behaviour adds a parameter and a few lines
in the middle of the others.

The jobs are also stuck to email. Texts need the same retry and the same log: the only way to reuse them is to copy
the loop into a second class.

Open **Diff from base** to see the full before and after.
