Compare the two sides: `notify` receives an `OrderNotification`, and `SmtpMailer.send` wants an `Email` with `to`,
`subject` and `body`. The adapter's whole job is to turn the first into the second.
