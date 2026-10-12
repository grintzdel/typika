+++
id = "concrete-dependencies"
title = "Glued to the infrastructure"
+++

Before this template, the checkout service created what it used:

```go
func NewService() *Service {
	return &Service{
		orders:   memstore.New(),
		notifier: smtp.New("smtp.shop.example", 587),
	}
}
```

It reads well, and it is easy to call: `checkout.NewService()` and you are done. The cost is in the field types,
`*memstore.OrderStore` and `*smtp.Mailer`. The `checkout` package imports both, so it depends on everything they
depend on: an SMTP host, a port, a storage format.

A test cannot replace them. Every test run sends real emails, and no test can check what they said, so the email
total is the one behaviour nobody verifies. Switching to another email provider means editing the checkout, the code
that should change least.

Open **Diff from base** to see the full before and after.
