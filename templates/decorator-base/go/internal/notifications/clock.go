package notifications

import "time"

type Clock interface {
	Now() time.Time
}
