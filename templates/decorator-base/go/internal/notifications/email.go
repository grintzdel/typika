package notifications

import (
	"fmt"
	"time"
)

type Throttle struct {
	Clock    Clock
	Interval time.Duration
}

type EmailOptions struct {
	MaxAttempts int
	Logger      Logger
	Throttle    *Throttle
}

type Email struct {
	mailer     Mailer
	options    EmailOptions
	lastSentAt map[string]time.Time
}

func NewEmail(mailer Mailer, options EmailOptions) *Email {
	return &Email{mailer: mailer, options: options, lastSentAt: map[string]time.Time{}}
}

func (e *Email) Notify(recipient, message string) error {
	throttle := e.options.Throttle
	if throttle != nil {
		last, ok := e.lastSentAt[recipient]
		if ok && throttle.Clock.Now().Sub(last) < throttle.Interval {
			return nil
		}
	}

	maxAttempts := max(e.options.MaxAttempts, 1)
	for attempt := 1; ; attempt++ {
		err := e.mailer.Send(recipient, message)
		if err == nil {
			break
		}
		if attempt >= maxAttempts {
			if e.options.Logger != nil {
				e.options.Logger.Info(fmt.Sprintf("failed to notify %s: %v", recipient, err))
			}
			return err
		}
	}

	if e.options.Logger != nil {
		e.options.Logger.Info("notified " + recipient)
	}
	if throttle != nil {
		e.lastSentAt[recipient] = throttle.Clock.Now()
	}
	return nil
}
