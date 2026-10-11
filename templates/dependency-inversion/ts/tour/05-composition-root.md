+++
id = "composition-root"
title = "One place to choose"
file = "src/open-shop.ts"
region = "composition-root"
also = ["src/main.ts"]
+++

Someone still has to create the SMTP mailer and the store. That job moves to `openShop`, the *composition root*: the
one place that knows every concrete class and wires them together. `main.ts` calls it and never sees the details.

Changing email provider now means writing a new class that implements `Notifier` and changing one line here. The
checkout, its tests and the rest of the shop stay as they are.

Keep the composition root at the edge of the program and keep it boring: no conditions, no business rules, only
`new` and arguments. When it grows, split it by module, but resist the urge to reach for it from inside the business
code: a service that asks a global container for its dependencies has gone back to choosing them itself.
