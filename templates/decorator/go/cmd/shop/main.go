package main

import (
	"errors"
	"fmt"
	"time"

	"example.com/shop/internal/notifications"
)

type flakySMTP struct {
	hiccups int
}

func (m *flakySMTP) Send(to, body string) error {
	if to == "grace@example.com" && m.hiccups > 0 {
		m.hiccups--
		fmt.Printf("  smtp    timeout while sending to %s\n", to)
		return errors.New("SMTP timeout")
	}
	fmt.Printf("  email   to %s: %s\n", to, body)
	return nil
}

type consoleLogger struct{}

func (consoleLogger) Info(line string) {
	fmt.Printf("  log     %s\n", line)
}

type manualClock struct {
	now time.Time
}

func (c *manualClock) Now() time.Time {
	return c.now
}

func main() {
	clock := &manualClock{now: time.Date(2026, time.October, 12, 9, 0, 0, 0, time.UTC)}
	notifier := notifications.NewEmailNotifier(notifications.EmailServices{
		Mailer: &flakySMTP{hiccups: 1},
		Logger: consoleLogger{},
		Clock:  clock,
	})

	fmt.Println("Ada: order shipped")
	_ = notifier.Notify("ada@example.com", "Your order order-1 has shipped.")

	fmt.Println("Ada: order delivered, ten seconds later")
	clock.now = clock.now.Add(10 * time.Second)
	_ = notifier.Notify("ada@example.com", "Your order order-1 has been delivered.")

	fmt.Println("Ada: order delivered, one minute later")
	clock.now = clock.now.Add(time.Minute)
	_ = notifier.Notify("ada@example.com", "Your order order-1 has been delivered.")

	fmt.Println("Grace: order shipped, through a flaky SMTP server")
	_ = notifier.Notify("grace@example.com", "Your order order-2 has shipped.")
}
