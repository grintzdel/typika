package adapters

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
)

var _ orders.Notifier = (*EmailNotifier)(nil)

type EmailNotifier struct {
	mailer *infra.SMTPMailer
}

func NewEmailNotifier(mailer *infra.SMTPMailer) *EmailNotifier {
	return &EmailNotifier{mailer: mailer}
}

func (n *EmailNotifier) Notify(notification orders.Notification) {}
