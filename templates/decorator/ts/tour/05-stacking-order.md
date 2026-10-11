+++
id = "stacking-order"
title = "The order of the layers"
file = "src/notifications/notifiers.ts"
region = "stack"
also = ["tests/email-notifier.test.ts"]
+++

`createEmailNotifier` builds the stack from the inside out, one layer per line: the email notifier, wrapped in
retries, wrapped in logging, wrapped in throttling. A call travels through the layers the other way, from the outside
in.

The order is part of the behaviour. Logging wraps retrying, so it sees one call per email and logs the final outcome,
not each attempt. Throttling wraps logging, so a dropped email is not logged as sent. Swap two layers and every class
is still correct, yet the log lies.

This is the price of the pattern's flexibility: the behaviour of the whole is in the composition, not in any class.
`tests/email-notifier.test.ts` tests the stack as a whole for that reason.

Try it: the `stacking-order` exercise gives you the layers in the wrong order. The `add-sms-with-retry` exercise asks
you to reuse retry and log for text messages, starting from the base.
