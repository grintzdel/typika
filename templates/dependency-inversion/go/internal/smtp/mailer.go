package smtp

import "fmt"

type Mailer struct {
	host string
	port int
}

func New(host string, port int) *Mailer {
	return &Mailer{host: host, port: port}
}

func (m *Mailer) Notify(recipient, message string) error {
	fmt.Printf("SMTP %s:%d -> %s: %s\n", m.host, m.port, recipient, message)
	return nil
}
