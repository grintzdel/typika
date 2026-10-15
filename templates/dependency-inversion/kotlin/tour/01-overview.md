+++
id = "overview"
title = "Who chooses the mailer?"
file = "src/main/kotlin/Main.kt"
+++

When a customer places an order, the shop saves it and emails a confirmation. Click **Run**: the SMTP mailer prints
the two confirmations it would send.

Saving and emailing are details. Next year the store will be a database and the email will go through a hosted API.
The rule that matters to the business, "confirm every saved order with its total", should not change when they do,
and it should be testable without either of them.

The question this template answers is: **which way should dependencies point between business code and
infrastructure?** The dependency inversion principle answers: both depend on abstractions, and the abstractions belong
to the business side.

In the next steps you will see a service glued to its infrastructure, the interfaces it owns, how it receives them,
and the one place where the real pieces are chosen.
