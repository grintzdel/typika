package notifications

import "fmt"

type Logging struct {
	Notifier
	logger Logger
}

func NewLogging(inner Notifier, logger Logger) *Logging {
	return &Logging{Notifier: inner, logger: logger}
}

// #region tour:around
func (l *Logging) Notify(recipient, message string) error {
	if err := l.Notifier.Notify(recipient, message); err != nil {
		l.logger.Info(fmt.Sprintf("failed to notify %s: %v", recipient, err))
		return err
	}
	l.logger.Info("notified " + recipient)
	return nil
}

// #endregion
