The listener that `subscribe` registers is the only code that sees the error first. Wrap the call to `subscriber` in
a `try / catch` there, and pass the error to `this.#onSubscriberError`.
