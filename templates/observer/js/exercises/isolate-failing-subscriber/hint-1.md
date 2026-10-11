`dispatchEvent` already calls every listener, even after one throws. What it does with the error is the problem: it
reports it to the global error handler, which crashes Node and never reaches `onSubscriberError`.
