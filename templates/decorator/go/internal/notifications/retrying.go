package notifications

// #region tour:decorator
type Retrying struct {
	Notifier
	maxAttempts int
}

func NewRetrying(inner Notifier, maxAttempts int) *Retrying {
	return &Retrying{Notifier: inner, maxAttempts: maxAttempts}
}

func (r *Retrying) Notify(recipient, message string) error {
	var err error
	for attempt := 1; attempt <= r.maxAttempts; attempt++ {
		if err = r.Notifier.Notify(recipient, message); err == nil {
			return nil
		}
	}
	return err
}

// #endregion
