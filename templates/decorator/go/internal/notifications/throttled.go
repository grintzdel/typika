package notifications

import "time"

type Throttled struct {
	Notifier
	clock      Clock
	interval   time.Duration
	lastSentAt map[string]time.Time
}

func NewThrottled(inner Notifier, clock Clock, interval time.Duration) *Throttled {
	return &Throttled{Notifier: inner, clock: clock, interval: interval, lastSentAt: map[string]time.Time{}}
}

func (t *Throttled) Notify(recipient, message string) error {
	last, ok := t.lastSentAt[recipient]
	if ok && t.clock.Now().Sub(last) < t.interval {
		return nil
	}
	if err := t.Notifier.Notify(recipient, message); err != nil {
		return err
	}
	t.lastSentAt[recipient] = t.clock.Now()
	return nil
}
