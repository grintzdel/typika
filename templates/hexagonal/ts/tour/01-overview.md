+++
id = "overview"
title = "Rules that only HTTP can reach"
file = "src/main.ts"
+++

Click **Run**: the shop places, pays, ships and cancels orders, and each step prints the email, the broker message
and the card charge it causes. Every call goes through `http.handle`, because in the base that is the only way in.

In the base, `OrdersHandler` parses the request, checks the business rules, writes the row, charges the card,
publishes and emails, all in one class. To place an order from a CSV import or a scheduled job, you would either copy
that logic or fake an HTTP request to your own handler. To test a rule such as "a shipped order cannot be cancelled",
you have to build a request.

The hexagonal architecture, also called ports and adapters, puts the business core in the middle and everything else
around it. You will see the pure domain, the ports the core declares, the adapters that plug into them, and the one
place where they are wired together.
