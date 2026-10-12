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
	logging := NewLogging(sending, services.Logger)
	retrying := NewRetrying(logging, maxAttempts)
	return NewThrottled(retrying, services.Clock, time.Minute)
}

// #endregion
