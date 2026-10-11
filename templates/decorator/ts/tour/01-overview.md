+++
id = "overview"
title = "One email, three extra jobs"
file = "src/main.ts"
+++

The shop emails a customer when an order ships. Sending an email is one line, but the shop wants more around it:
retry when the SMTP server times out, log every email for support, and never send a customer more than one email a
minute. Click **Run** to see all three at work.

Each of those jobs is useful on its own, and the next channel, text messages, will want some of them but not all. The
question this template answers is: **how do you add behaviour to an object, in any combination, without one class
growing an option for each?**

The Decorator pattern gives one answer. Keep the object small, and add each behaviour by wrapping it in another
object that looks exactly the same from the outside.

In the next steps you will see the code before the pattern, the shared interface, the decorators, and why their order
matters.
