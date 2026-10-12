package notifications_test

import (
	"errors"
	"time"

	"example.com/shop/internal/notifications"
)

type failingMailer struct {
	failures int
	sent     []string
}

func mailerFailing(times int) *failingMailer {
	return &failingMailer{failures: times}
}

func (m *failingMailer) Send(to, body string) error {
	m.sent = append(m.sent, to+": "+body)
	if m.failures > 0 {
		m.failures--
		return errors.New("SMTP timeout")
	}
	return nil
}

type recordingLogger struct {
	lines []string
}

func (l *recordingLogger) Info(line string) {
	l.lines = append(l.lines, line)
}

type fakeClock struct {
	now time.Time
}

func newFakeClock() *fakeClock {
	return &fakeClock{now: time.Date(2026, time.October, 12, 9, 0, 0, 0, time.UTC)}
}

func (c *fakeClock) Now() time.Time {
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.now = c.now.Add(d)
}

type services struct {
	mailer *failingMailer
	logger *recordingLogger
	clock  *fakeClock
}

func newServices(mailer *failingMailer) services {
	return services{mailer: mailer, logger: &recordingLogger{}, clock: newFakeClock()}
}

func (s services) emailNotifier() notifications.Notifier {
	return notifications.NewEmailNotifier(notifications.EmailServices{Mailer: s.mailer, Logger: s.logger, Clock: s.clock})
}
