package notifications

type Email struct {
	mailer Mailer
}

func NewEmail(mailer Mailer) *Email {
	return &Email{mailer: mailer}
}

func (e *Email) Notify(recipient, message string) error {
	return e.mailer.Send(recipient, message)
}
