Compare the two sides: `Notify` receives an `orders.Notification`, and `SMTPMailer.Send` wants an `infra.Email` with
`To`, `Subject` and `Body`. The adapter's whole job is to turn the first into the second.
