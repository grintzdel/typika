Each call to a subscriber needs its own `try / catch`, inside the loop. In the `catch`, pass the error to
`this.onSubscriberError` and let the loop move on to the next subscriber.
