package notifications

import "time"

type EmailServices struct {
	Mailer Mailer
	Logger Logger
	Clock  Clock
}

const maxAttempts = 3

// #region tour:stack
func NewEmailNotifier(services EmailServices) Notifier {
	sending := NewEmail(services.Mailer)
	retrying := NewRetrying(sending, maxAttempts)
	logging := NewLogging(retrying, services.Logger)
	return NewThrottled(logging, services.Clock, time.Minute)
}

// #endregion
