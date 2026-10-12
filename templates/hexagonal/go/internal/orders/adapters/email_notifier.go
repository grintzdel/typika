package adapters

import (
	"fmt"

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

func emailFor(notification orders.Notification) infra.Email {
	order := notification.Order
	email := infra.Email{To: order.Customer.Email}
	switch notification.Kind {
	case orders.ConfirmedNotice:
		email.Subject = fmt.Sprintf("Order %s confirmed", order.ID)
		email.Body = fmt.Sprintf("Hello %s, we received your order of %s.", order.Customer.Name, order.Total)
	case orders.ShippedNotice:
		email.Subject = fmt.Sprintf("Order %s shipped", order.ID)
		email.Body = fmt.Sprintf("Hello %s, your order is on its way.", order.Customer.Name)
	case orders.CancelledNotice:
		email.Subject = fmt.Sprintf("Order %s cancelled", order.ID)
		email.Body = fmt.Sprintf("Hello %s, your order was cancelled: %s.", order.Customer.Name, notification.Reason)
	}
	return email
}

func (n *EmailNotifier) Notify(notification orders.Notification) {
	n.mailer.Send(emailFor(notification))
}
