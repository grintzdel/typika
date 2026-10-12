package notifications_test

import (
	"errors"
	"slices"
	"testing"

	"example.com/shop/internal/notifications"
)

type failingSms struct {
	failures int
	sent     []string
}

func smsFailing(times int) *failingSms {
	return &failingSms{failures: times}
}

func (s *failingSms) SendSms(phoneNumber, text string) error {
	s.sent = append(s.sent, phoneNumber+": "+text)
	if s.failures > 0 {
		s.failures--
		return errors.New("SMS gateway busy")
	}
	return nil
}

func smsNotifier(sms *failingSms, logger *recordingLogger) notifications.Notifier {
	return notifications.NewSmsNotifier(notifications.SmsServices{Sms: sms, Logger: logger})
}

func TestTextNotifications(t *testing.T) {
	t.Run("texts the message to the phone number", func(t *testing.T) {
		sms := smsFailing(0)

		if err := smsNotifier(sms, &recordingLogger{}).Notify("+33600000001", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		if want := []string{"+33600000001: Your order has shipped."}; !slices.Equal(sms.sent, want) {
			t.Errorf("sent = %q, want %q", sms.sent, want)
		}
	})

	t.Run("retries a failed text, up to three attempts", func(t *testing.T) {
		sms := smsFailing(2)

		if err := smsNotifier(sms, &recordingLogger{}).Notify("+33600000001", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		if len(sms.sent) != 3 {
			t.Errorf("sent %d texts, want 3", len(sms.sent))
		}
	})

	t.Run("gives up after three failed attempts and logs the failure once", func(t *testing.T) {
		sms := smsFailing(3)
		logger := &recordingLogger{}

		err := smsNotifier(sms, logger).Notify("+33600000001", "Your order has shipped.")

		if err == nil || err.Error() != "SMS gateway busy" {
			t.Errorf("error = %v, want SMS gateway busy", err)
		}
		if len(sms.sent) != 3 {
			t.Errorf("sent %d texts, want 3", len(sms.sent))
		}
		assertLines(t, logger, "failed to notify +33600000001: SMS gateway busy")
	})

	t.Run("logs a sent text once, whatever the number of attempts", func(t *testing.T) {
		logger := &recordingLogger{}

		if err := smsNotifier(smsFailing(1), logger).Notify("+33600000001", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		assertLines(t, logger, "notified +33600000001")
	})

	t.Run("never holds a text back", func(t *testing.T) {
		sms := smsFailing(0)
		notifier := smsNotifier(sms, &recordingLogger{})

		_ = notifier.Notify("+33600000001", "Your order has shipped.")
		_ = notifier.Notify("+33600000001", "Your order has been delivered.")

		if len(sms.sent) != 2 {
			t.Errorf("sent %d texts, want 2", len(sms.sent))
		}
	})
}
