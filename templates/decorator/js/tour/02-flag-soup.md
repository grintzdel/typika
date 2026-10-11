+++
id = "flag-soup"
title = "One function, one option per job"
+++

Before the pattern, `emailNotifier` did every job itself, each one switched on by an option:

```js
export const emailNotifier = (mailer, { maxAttempts = 1, logger, throttle } = {}) => {
```

The function it returns reads all three options and interleaves them: check the throttle, loop over the attempts, log
the failure inside the loop, log the success after it, record the send time at the end. Every new behaviour adds an
option and a few lines in the middle of the others.

The jobs are also stuck to email. Texts need the same retry and the same log: the only way to reuse them is to copy
the loop into a second function.

Open **Diff from base** to see the full before and after.
