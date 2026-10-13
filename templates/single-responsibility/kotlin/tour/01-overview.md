+++
id = "overview"
title = "One order, five jobs"
file = "src/main/kotlin/Main.kt"
+++

Placing an order looks like one action, but the shop does five jobs behind it. It checks the order, works out the
price, saves the order, writes an invoice and emails it. Click **Run** to see the invoices of two sample orders.

Each job belongs to a different part of the business. Marketing changes the member discount. Accounting changes how
an invoice reads. A product owner adds a new check. When all five jobs live in one method, each of those requests edits
the same code, and a change to the invoice wording can break the price.

The question this template answers is: **where should each job live so that a change touches one small piece?**

The single responsibility principle answers with a rule of thumb: group code by **who asks for it to change**. In the
next steps you will see the code before the split, the pieces it splits into, and what holds them together.
