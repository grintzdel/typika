package infra

import "fmt"

type Email struct {
	To      string
	Subject string
	Body    string
}

type SMTPMailer struct {
	Sent []Email
	host string
}

func NewSMTPMailer(host string) *SMTPMailer {
	return &SMTPMailer{host: host}
}

func (m *SMTPMailer) Send(email Email) {
	m.Sent = append(m.Sent, email)
	fmt.Printf("SMTP %s -> %s: %s\n", m.host, email.To, email.Subject)
}
