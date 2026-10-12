package notifications_test

import (
	"errors"
	"testing"
	"time"

	"example.com/shop/internal/notifications"
)

type countingNotifier struct {
	failures int
	calls    int
}

func notifierFailing(times int) *countingNotifier {
	return &countingNotifier{failures: times}
}

func (n *countingNotifier) Notify(recipient, message string) error {
	n.calls++
	if n.failures > 0 {
		n.failures--
		return errors.New("service unavailable")
	}
	return nil
}

func TestRetrying(t *testing.T) {
	t.Run("calls the notifier it wraps again until it succeeds", func(t *testing.T) {
		inner := notifierFailing(1)

		if err := notifications.NewRetrying(inner, 3).Notify("ada@example.com", "Hello"); err != nil {
			t.Fatal(err)
		}

		if inner.calls != 2 {
			t.Errorf("calls = %d, want 2", inner.calls)
		}
	})

	t.Run("returns the last error once every attempt failed", func(t *testing.T) {
		inner := notifierFailing(5)

		err := notifications.NewRetrying(inner, 2).Notify("ada@example.com", "Hello")

		if err == nil || err.Error() != "service unavailable" {
			t.Errorf("error = %v, want service unavailable", err)
		}
		if inner.calls != 2 {
			t.Errorf("calls = %d, want 2", inner.calls)
		}
	})
}

func TestLogging(t *testing.T) {
	t.Run("logs a notification once the notifier it wraps succeeded", func(t *testing.T) {
		logger := &recordingLogger{}

		if err := notifications.NewLogging(notifierFailing(0), logger).Notify("ada@example.com", "Hello"); err != nil {
			t.Fatal(err)
		}

		assertLines(t, logger, "notified ada@example.com")
	})

	t.Run("logs the failure of the notifier it wraps, and returns it", func(t *testing.T) {
		logger := &recordingLogger{}

		err := notifications.NewLogging(notifierFailing(1), logger).Notify("ada@example.com", "Hello")

		if err == nil {
			t.Error("error = nil, want service unavailable")
		}
		assertLines(t, logger, "failed to notify ada@example.com: service unavailable")
	})
}

func TestThrottled(t *testing.T) {
	t.Run("skips the notifier it wraps for a recipient notified less than the interval ago", func(t *testing.T) {
		inner := notifierFailing(0)
		clock := newFakeClock()
		notifier := notifications.NewThrottled(inner, clock, time.Second)

		_ = notifier.Notify("ada@example.com", "Hello")
		clock.Advance(999 * time.Millisecond)
		_ = notifier.Notify("ada@example.com", "Hello again")

		if inner.calls != 1 {
			t.Errorf("calls = %d, want 1", inner.calls)
		}
	})
}
