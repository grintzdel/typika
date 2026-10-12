package notifications_test

import (
	"slices"
	"testing"
	"time"
)

func assertSent(t *testing.T, mailer *failingMailer, want int) {
	t.Helper()
	if len(mailer.sent) != want {
		t.Errorf("sent %d emails, want %d", len(mailer.sent), want)
	}
}

func assertLines(t *testing.T, logger *recordingLogger, want ...string) {
	t.Helper()
	if !slices.Equal(logger.lines, want) {
		t.Errorf("log = %q, want %q", logger.lines, want)
	}
}

func TestEmailNotifications(t *testing.T) {
	t.Run("emails the message to the recipient", func(t *testing.T) {
		s := newServices(mailerFailing(0))

		if err := s.emailNotifier().Notify("ada@example.com", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		if want := []string{"ada@example.com: Your order has shipped."}; !slices.Equal(s.mailer.sent, want) {
			t.Errorf("sent = %q, want %q", s.mailer.sent, want)
		}
	})

	t.Run("retries a failed email, up to three attempts", func(t *testing.T) {
		s := newServices(mailerFailing(2))

		if err := s.emailNotifier().Notify("ada@example.com", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		assertSent(t, s.mailer, 3)
	})

	t.Run("gives up after three failed attempts", func(t *testing.T) {
		s := newServices(mailerFailing(3))

		err := s.emailNotifier().Notify("ada@example.com", "Your order has shipped.")

		if err == nil || err.Error() != "SMTP timeout" {
			t.Errorf("error = %v, want SMTP timeout", err)
		}
		assertSent(t, s.mailer, 3)
	})

	t.Run("logs a sent email once, whatever the number of attempts", func(t *testing.T) {
		s := newServices(mailerFailing(1))

		if err := s.emailNotifier().Notify("ada@example.com", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		assertLines(t, s.logger, "notified ada@example.com")
	})

	t.Run("logs a failed email once, after the last attempt", func(t *testing.T) {
		s := newServices(mailerFailing(3))

		if err := s.emailNotifier().Notify("ada@example.com", "Your order has shipped."); err == nil {
			t.Fatal("error = nil, want the SMTP failure")
		}

		assertLines(t, s.logger, "failed to notify ada@example.com: SMTP timeout")
	})

	t.Run("drops a second email to the same recipient within a minute, without logging it", func(t *testing.T) {
		s := newServices(mailerFailing(0))
		notifier := s.emailNotifier()

		_ = notifier.Notify("ada@example.com", "Your order has shipped.")
		s.clock.Advance(time.Minute - time.Millisecond)
		_ = notifier.Notify("ada@example.com", "Your order has been delivered.")

		assertSent(t, s.mailer, 1)
		assertLines(t, s.logger, "notified ada@example.com")
	})

	t.Run("emails the same recipient again once a minute has passed", func(t *testing.T) {
		s := newServices(mailerFailing(0))
		notifier := s.emailNotifier()

		_ = notifier.Notify("ada@example.com", "Your order has shipped.")
		s.clock.Advance(time.Minute)
		_ = notifier.Notify("ada@example.com", "Your order has been delivered.")

		assertSent(t, s.mailer, 2)
	})

	t.Run("does not hold back other recipients", func(t *testing.T) {
		s := newServices(mailerFailing(0))
		notifier := s.emailNotifier()

		_ = notifier.Notify("ada@example.com", "Your order has shipped.")
		_ = notifier.Notify("grace@example.com", "Your order has shipped.")

		assertSent(t, s.mailer, 2)
	})

	t.Run("does not hold back a recipient whose previous email failed", func(t *testing.T) {
		s := newServices(mailerFailing(3))
		notifier := s.emailNotifier()

		if err := notifier.Notify("ada@example.com", "Your order has shipped."); err == nil {
			t.Fatal("error = nil, want the SMTP failure")
		}
		if err := notifier.Notify("ada@example.com", "Your order has shipped."); err != nil {
			t.Fatal(err)
		}

		assertSent(t, s.mailer, 4)
	})
}
