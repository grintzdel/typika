package notifications

type Notifier interface {
	Notify(recipient, message string) error
}
