package infra

import "time"

type ManualClock struct {
	now time.Time
}

func NewManualClock(start string) *ManualClock {
	now, err := time.Parse(time.RFC3339, start)
	if err != nil {
		panic(err)
	}
	return &ManualClock{now: now}
}

func (c *ManualClock) Now() time.Time {
	return c.now
}

func (c *ManualClock) AdvanceDays(days int) {
	c.now = c.now.AddDate(0, 0, days)
}
