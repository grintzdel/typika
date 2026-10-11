+++
id = "stacking-order"
title = "The order of the layers"
file = "src/notifications/notifiers.js"
region = "stack"
also = ["tests/email-notifier.test.js"]
+++

`createEmailNotifier` builds the stack from the inside out, one layer per line: the email notifier, wrapped in
retries, wrapped in logging, wrapped in throttling. A call travels through the layers the other way, from the outside
in.

The order is part of the behaviour. Logging wraps retrying, so it sees one call per email and logs the final outcome,
not each attempt. Throttling wraps logging, so a dropped email is not logged as sent. Swap two layers and every
function is still correct, yet the log lies.

You could write the stack as one nested expression, `withThrottle(withLogging(withRetry(...)))`, but then it reads
from the outside in, the opposite of how it is built. One named layer per line keeps the order visible.

This is the price of the pattern's flexibility: the behaviour of the whole is in the composition, not in any function.
`tests/email-notifier.test.js` tests the stack as a whole for that reason.

Try it: the `stacking-order` exercise gives you the layers in the wrong order. The `add-sms-with-retry` exercise asks
you to reuse retry and log for text messages, starting from the base.
