package notifications

type Mailer interface {
	Send(to, body string) error
}
