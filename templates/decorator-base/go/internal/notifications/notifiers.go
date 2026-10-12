package notifications

import "time"

type EmailServices struct {
	Mailer Mailer
	Logger Logger
	Clock  Clock
}

const maxAttempts = 3

func NewEmailNotifier(services EmailServices) Notifier {
	return NewEmail(services.Mailer, EmailOptions{
		MaxAttempts: maxAttempts,
		Logger:      services.Logger,
		Throttle:    &Throttle{Clock: services.Clock, Interval: time.Minute},
	})
}
